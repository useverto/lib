import { getTradingPosts } from "./get_trading_posts";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import { maxInt } from "@utils/constants";
import moment from "moment";

export const price = async (
  token: string
): Promise<{ prices: number[]; dates: string[] }> => {
  const posts = await getTradingPosts();

  const orderTxs = (
    await query<EdgeQueryResponse>({
      query: `
    query($recipients: [String!]) {
      transactions(
        recipients: $recipients
        tags: [
          { name: "Exchange", values: "Verto" }
          { name: "Type", values: "Buy" }
          { name: "Token", values: "${token}" }
        ]
        first: ${maxInt}
      ) {
        edges {
          node {
            id
            block {
              timestamp
            }
            quantity {
              ar
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

  const orders: { id: string; amnt: number; timestamp: number }[] = [];
  orderTxs.map((order) => {
    orders.push({
      id: order.node.id,
      amnt: parseFloat(order.node.quantity.ar),
      timestamp: order.node.block.timestamp,
    });
  });

  const prices: number[] = [];
  const days: string[] = [];

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
            query: `
          query($txID: [String!]!) {
            transactions(
              tags: [
                { name: "Exchange", values: "Verto" }
                { name: "Type", values: "Confirmation" }
                { name: "Match", values: $txID }
              ]
            ) {
              edges {
                node {
                  tags {
                    name
                    value
                  }
                }
              }
            }
          }`,
            variables: {
              txID: order.id,
            },
          })
        ).data.transactions.edges;

        if (confirmationTx.length === 1) {
          dayPrices.push(
            order.amnt /
              parseFloat(
                // @ts-ignore
                confirmationTx[0].node.tags
                  .find((tag) => tag.name === "Received")
                  .value.split(" ")[0]
              )
          );
        }
      }
    }

    if (dayPrices.length === 0) {
      prices.push(prices[prices.length - 1]);
    } else {
      prices.push(dayPrices.reduce((a, b) => a + b, 0) / dayPrices.length);
    }
    days.push(low.format("MMM DD"));

    high = low;
  }

  return { prices: prices.reverse(), dates: days.reverse() };
};
