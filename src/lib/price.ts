import Arweave from "arweave";
import { getTradingPosts } from "./get_trading_posts";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import sellQuery from "../queries/sell.gql";
import { maxInt } from "@utils/constants";
import moment from "moment";

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

  for (let j = index; j < i; j++) {
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
      query: sellQuery,
      variables: {
        recipients: posts,
        token,
        num: maxInt,
      },
    })
  ).data.transactions.edges;

  const orders: {
    rate: number;
    timestamp: number;
  }[] = [];
  orderTxs.map(({ node }) => {
    const rateTag = node.tags.find((tag) => tag.name === "Rate");

    if (rateTag) {
      orders.push({
        rate: 1 / parseFloat(rateTag.value),
        timestamp: node.block.timestamp,
      });
    }
  });

  let prices: number[] = [];
  const days: string[] = [];

  if (orders.length > 0) {
    let high = moment().add(1, "days").hours(0).minutes(0).seconds(0);

    while (high.unix() >= orders[orders.length - 1].timestamp) {
      const low = high.clone().subtract(1, "days");

      const day: number[] = orders
        .filter(
          (order) =>
            order.timestamp <= high.unix() && order.timestamp >= low.unix()
        )
        .map((order) => order.rate);

      prices.push(day.reduce((a, b) => a + b, 0) / day.length);
      days.push(low.format("MMM DD"));

      high = low;
    }

    if (!prices.every((price) => isNaN(price))) {
      prices = fillArray(prices.reverse());
    }
  }

  return { prices, dates: days.reverse() };
};
