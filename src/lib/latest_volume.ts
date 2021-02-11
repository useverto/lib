import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import sellQuery from "../queries/sell.gql";
import { maxInt } from "@utils/constants";
import moment from "moment";

export const latestVolume = async (token: string): Promise<number> => {
  const orderTxs = (
    await query<EdgeQueryResponse>({
      query: sellQuery,
      variables: {
        token,
        num: maxInt,
      },
    })
  ).data.transactions.edges;

  const orders: { amnt: number; timestamp: number }[] = [];
  orderTxs.map(({ node }) => {
    const inputTag = node.tags.find((tag) => tag.name === "Input");

    if (inputTag) {
      orders.push({
        amnt: JSON.parse(inputTag.value).qty,
        timestamp: node.block.timestamp,
      });
    }
  });

  if (orders.length > 0) {
    const high = moment().add(1, "days").hours(0).minutes(0).seconds(0);
    const low = high.clone().subtract(1, "days");

    return orders
      .filter(
        (order) =>
          order.timestamp <= high.unix() && order.timestamp >= low.unix()
      )
      .map((order) => order.amnt)
      .reduce((a, b) => a + b, 0);
  }

  return 0;
};
