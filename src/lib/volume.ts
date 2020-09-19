import { getTradingPosts } from "./get_trading_posts";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import { maxInt } from "@utils/constants";
import moment from "moment";

export const volume = async (
  token: string
): Promise<{ volume: number[]; dates: string[] }> => {
  const posts = await getTradingPosts();

  const orderTxs = (
    await query<EdgeQueryResponse>({
      query: `
    query($recipients: [String!]) {
      transactions(
        recipients: $recipients
        tags: [
          { name: "Exchange", values: "Verto" }
          { name: "Type", values: "Sell" }
          { name: "Contract", values: "${token}" }
        ]
        first: ${maxInt}
      ) {
        edges {
          node {
            block {
              timestamp
            }
            tags {
              name
              value
            }
          }
        }
      }
    }`,
      variables: {
        recipients: posts,
      },
    })
  ).data.transactions.edges;

  const orders: { amnt: number; timestamp: number }[] = [];
  orderTxs.map((order) => {
    orders.push({
      amnt: JSON.parse(
        // @ts-ignore
        order.node.tags.find((tag) => tag.name === "Input").value
      ).qty,
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
