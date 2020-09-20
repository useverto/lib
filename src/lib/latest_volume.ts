import { getTradingPosts } from "./get_trading_posts";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import { maxInt } from "@utils/constants";
import moment from "moment";

export const latestVolume = async (
  token: string
): Promise<number> => {
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
    const inputTag = order.node.tags.find((tag) => tag.name === "Input");
    if (!inputTag) return;
    orders.push({
      amnt: JSON.parse(inputTag.value).qty,
      timestamp: order.node.block.timestamp,
    });
  });

  let volume: number = 0;

  if (orders.length > 0) {
    const high = moment().add(1, "days").hours(0).minutes(0).seconds(0);
    const low = high.clone().subtract(1, "days");

    orders.map((order) => {
      if (order.timestamp <= high.unix() && order.timestamp >= low.unix()) {
        volume += order.amnt;
      }
    });
  }

  return volume;
};
