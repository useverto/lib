import Arweave from "arweave";
import { getTradingPosts } from "./get_trading_posts";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import buyQuery from "../queries/buy.gql";
import { maxInt } from "@utils/constants";
import moment from "moment";
import confirmationQuery from "../queries/confirmation.gql";

const fillArray = (arr: number[]): number[] => {
  const index = arr.findIndex((entry) => isNaN(entry));
  if (index === -1) {
    return arr;
  }

  let i = index;

  while (i < arr.length) {
    if (isNaN(arr[i])) {
      i++;
    } else {
      break;
    }
  }

  for (let j = index; j <= i; j++) {
    if (index === 0) {
      arr[j] = arr[i];
    } else {
      arr[j] = arr[index - 1];
    }
  }

  return fillArray(arr);
};

export const price = async (
  client: Arweave,
  token: string,
  exchangeContract: string,
  exchangeWallet: string
): Promise<{ prices: number[]; dates: string[] } | undefined> => {
  const posts = await getTradingPosts(client, exchangeContract, exchangeWallet);

  const orderTxs = (
    await query<EdgeQueryResponse>({
      query: buyQuery,
      variables: {
        recipients: posts,
        token,
        num: maxInt,
      },
    })
  ).data.transactions.edges;

  const orders: { id: string; amnt: number; timestamp: number }[] = [];
  orderTxs.map((order) => {
    orders.push({
      id: order.node.id,
      amnt: parseFloat(order.node.quantity.ar),
      timestamp: order.node.block.timestamp,
    });
  });

  let prices: number[] = [];
  const days: string[] = [];

  if (orders.length > 0) {
    let high = moment().add(1, "days").hours(0).minutes(0).seconds(0);
    const limit =
      orders[orders.length - 1].timestamp >= 1599955200
        ? orders[orders.length - 1].timestamp
        : 1599955200;
    while (high.unix() >= limit) {
      const dayPrices: number[] = [];

      const low = high.clone().subtract(1, "days");
      for (const order of orders) {
        if (order.timestamp <= high.unix() && order.timestamp >= low.unix()) {
          const confirmationTx = (
            await query<EdgeQueryResponse>({
              query: confirmationQuery,
              variables: {
                txID: order.id,
              },
            })
          ).data.transactions.edges;

          if (confirmationTx.length === 1) {
            const recievedTag = confirmationTx[0].node.tags.find(
              (tag) => tag.name === "Received"
            );
            if (!recievedTag) return;
            dayPrices.push(
              order.amnt / parseFloat(recievedTag.value.split(" ")[0])
            );
          }
        }
      }

      prices.push(dayPrices.reduce((a, b) => a + b, 0) / dayPrices.length);
      days.push(low.format("MMM DD"));

      high = low;
    }

    if (!prices.every((price) => isNaN(price))) {
      prices = fillArray(prices.reverse());
    }
  }

  return { prices, dates: days.reverse() };
};
