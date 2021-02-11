import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
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
  token: string
): Promise<{ prices: number[]; dates: string[] } | undefined> => {
  const confirmationTxs = (
    await query<EdgeQueryResponse>({
      query: `
        query($num: Int) {
          transactions(
            tags: [
              { name: "Exchange", values: "Verto" }
              { name: "Type", values: "Confirmation" }
            ]
            first: $num
          ) {
            edges {
              node {
                id
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
      variables: {
        num: maxInt,
      },
    })
  ).data.transactions.edges;

  const orders: {
    rate: number;
    timestamp: number;
  }[] = [];
  for (const confirmation of confirmationTxs) {
    const node = confirmation.node;
    const receiveTag = node.tags.find((tag) => tag.name === "Received");

    if (receiveTag) {
      if (receiveTag.value.split(" ")[1] === "AR") {
        const matchTag = node.tags.find((tag) => tag.name === "Match");

        if (matchTag) {
          const tx = (
            await query<EdgeQueryResponse>({
              query: `
                query($txID: ID!) {
                  transaction(id: $txID) {
                    tags {
                      name
                      value
                    }
                  }
                }          
              `,
              variables: {
                txID: matchTag.value,
              },
            })
          ).data.transaction;

          const contractTag = tx.tags.find((tag) => tag.name === "Contract");
          if (contractTag && contractTag.value === token) {
            const rateTag = tx.tags.find((tag) => tag.name === "Rate");
            if (rateTag) {
              orders.push({
                rate: 1 / parseFloat(rateTag.value),
                timestamp: node.block
                  ? node.block.timestamp
                  : parseInt(new Date().getTime().toString().slice(0, -3)),
              });
            }
          }
        }
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
