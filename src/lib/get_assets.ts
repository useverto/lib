import Arweave from "arweave";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import latestInteractionQuery from "../queries/latestInteraction.gql";
import { getTokens } from "./get_tokens";
import { readContract } from "smartweave";

const latestInteraction = async (contract: string) => {
  return (
    await query<EdgeQueryResponse>({
      query: latestInteractionQuery,
      variables: {
        contract,
      },
    })
  ).data.transactions.edges[0]?.node.id;
};

export const getAssets = async (
  client: Arweave,
  addr: string
): Promise<{ id: string; name: string; ticker: string; balance: number }[]> => {
  // @ts-ignore
  const isBrowser = process.browser;

  const tokens = await getTokens(client);

  const balances: {
    id: string;
    name: string;
    ticker: string;
    balance: number;
  }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const latest = await latestInteraction(tokens[i].id);
    let contract;
    if (isBrowser) {
      // @ts-ignore
      const cache = JSON.parse(localStorage.getItem("smartweaveCache")) || {};

      if (tokens[i].id in cache) {
        if (cache[tokens[i].id].latest === latest) {
          contract = cache[tokens[i].id].state;
        } else {
          contract = await readContract(client, tokens[i].id);

          cache[tokens[i].id].latest = latest;
          cache[tokens[i].id].state = contract;
          // @ts-ignore
          localStorage.setItem("smartweaveCache", JSON.stringify(cache));
        }
      } else {
        contract = await readContract(client, tokens[i].id);

        cache[tokens[i].id] = {
          latest,
          state: contract,
        };
        // @ts-ignore
        localStorage.setItem("smartweaveCache", JSON.stringify(cache));
      }
    } else {
      contract = await readContract(client, tokens[i].id);
    }

    if (contract.balances[addr] > 0) {
      balances.push({
        id: tokens[i].id,
        name: tokens[i].name,
        ticker: tokens[i].ticker,
        balance: contract.balances[addr],
      });
    }
  }

  balances.sort((a, b) => {
    return b.balance - a.balance;
  });

  return balances;
};
