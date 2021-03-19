import Arweave from "arweave";
import { getTradingPosts } from "./get_trading_posts";
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

export const latestChainRate = async (
  client: Arweave,
  chain: string,
  useCache: boolean,
  exchangeContract: string,
  exchangeWallet: string
): Promise<number> => {
  const res = await chainRate(
    client,
    chain,
    useCache,
    exchangeContract,
    exchangeWallet
  );

  return res.rates[res.rates.length - 1];
};

export const chainRate = async (
  client: Arweave,
  chain: string,
  useCache: boolean,
  exchangeContract: string,
  exchangeWallet: string
): Promise<{ rates: number[]; dates: string[] }> => {
  const posts = await getTradingPosts(
    client,
    useCache,
    exchangeContract,
    exchangeWallet
  );

  const confirmationTxs = (
    await query<EdgeQueryResponse>({
      query: `
        query($posts: [String!], $num: Int) {
          transactions(
            owners: $posts
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
        posts,
        num: maxInt,
      },
    })
  ).data.transactions.edges;

  const swaps: { id: string; rate: number; timestamp: number }[] = [];
  for (const confirmation of confirmationTxs) {
    const node = confirmation.node;
    const receiveTag = node.tags.find((tag) => tag.name === "Received");

    if (receiveTag) {
      if (receiveTag.value.split(" ")[1] === chain) {
        const swapTag = node.tags.find((tag) => tag.name === "Swap");

        if (swapTag) {
          const swapTx = (
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
                txID: swapTag.value,
              },
            })
          ).data.transaction;

          const rateTag = swapTx.tags.find((tag) => tag.name === "Rate");
          if (rateTag) {
            swaps.push({
              id: node.id,
              rate: parseFloat(rateTag.value),
              timestamp: node.block
                ? node.block.timestamp
                : parseInt(new Date().getTime().toString().slice(0, -3)),
            });
          }
        }
      }
    }
  }

  let rates: number[] = [];
  const days: string[] = [];

  if (swaps.length > 0) {
    let high = moment().add(1, "days").hours(0).minutes(0).seconds(0);
    const limit = swaps[swaps.length - 1].timestamp;

    while (high.unix() >= limit) {
      const dayRates: number[] = [];

      const low = high.clone().subtract(1, "days");
      for (const swap of swaps) {
        if (swap.timestamp <= high.unix() && swap.timestamp >= low.unix()) {
          dayRates.push(swap.rate);
        }
      }

      rates.push(dayRates.reduce((a, b) => a + b, 0) / dayRates.length);
      days.push(low.format("MM.DD"));

      high = low;
    }

    if (!rates.every((rate) => isNaN(rate))) {
      rates = fillArray(rates.reverse());
    }
  }

  return { rates, dates: days.reverse() };
};
