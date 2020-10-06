import Arweave from "arweave";
import { getTradingPosts } from "./get_trading_posts";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import sellQuery from "../queries/sell.gql";
import { maxInt } from "@utils/constants";
import moment from "moment";

export const volume = async (
  client: Arweave,
  token: string
): Promise<{ volume: number[]; dates: string[] }> => {
  const posts = await getTradingPosts(client);

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

  const orders: { amnt: number; timestamp: number }[] = [];
  orderTxs.map((order) => {
    const inputTag = order.node.tags.find((tag) => tag.name === "Input");
    if (!inputTag) return;
    orders.push({
      amnt: JSON.parse(inputTag.value).qty,
      timestamp: order.node.block.timestamp,
    });
  });

  const volume: number[] = [];
  const days: string[] = [];

  if (orders.length > 0) {
    let high = moment().add(1, "days").hours(0).minutes(0).seconds(0);
    while (high.unix() >= orders[orders.length - 1].timestamp) {
      let sum = 0;

      const low = high.clone().subtract(1, "days");
      orders.map((order) => {
        if (order.timestamp <= high.unix() && order.timestamp >= low.unix()) {
          sum += order.amnt;
        }
      });

      volume.push(sum);
      days.push(low.format("MMM DD"));

      high = low;
    }
  }

  return { volume: volume.reverse(), dates: days.reverse() };
};
