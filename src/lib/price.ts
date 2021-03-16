import { all, run } from "ar-gql";
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
  token: string
): Promise<{ prices: number[]; dates: string[] } | undefined> => {
  const buys = await all(
    `
      query($token: String!, $cursor: String) {
        transactions(
          tags: [
            { name: "Exchange", values: "Verto" }
            { name: "Type", values: "Buy" }
            { name: "Token", values: [$token] }
          ]
          after: $cursor
        ) {
          edges {
            node {
              id
              quantity {
                ar
              }
            }
          }
        }
      }
    `,
    { token }
  );

  const orders: {
    rate: number;
    timestamp: number;
  }[] = [];

  for (const order of buys) {
    const confirmation = (
      await run(
        `
          query($order: String!) {
            transactions(
              tags: [
                { name: "Exchange", values: "Verto" }
                { name: "Type", values: "Confirmation" }
                { name: "Match", values: [$order] }
              ]
              first: 1
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
          }
        `,
        { order: order.node.id }
      )
    ).data.transactions.edges[0];

    if (confirmation) {
      const node = confirmation.node;
      const receivedTag = node.tags.find((tag) => tag.name === "Received");

      if (receivedTag) {
        orders.push({
          rate:
            parseFloat(receivedTag.value.split(" ")[0]) /
            parseFloat(order.node.quantity.ar),
          timestamp: node.block
            ? node.block.timestamp
            : parseInt(new Date().getTime().toString().slice(0, -3)),
        });
      }
    }
  }

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
