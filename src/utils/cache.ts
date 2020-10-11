import { query } from "./gql";
import { EdgeQueryResponse } from "../types";
import latestInteractionQuery from "../queries/latestInteraction.gql";
import Arweave from "arweave";
import { StateInterface } from "community-js/lib/faces";
import { readContract } from "smartweave";

const latestInteraction = async (contract: string): Promise<string> => {
  return (
    await query<EdgeQueryResponse>({
      query: latestInteractionQuery,
      variables: {
        contract,
      },
    })
  ).data.transactions.edges[0]?.node.id;
};

export const updateCache = (
  name: string,
  element: string,
  // eslint-disable-next-line
  value: any
): void => {
  // @ts-ignore
  const cache = JSON.parse(localStorage.getItem(name)) || {};

  cache[element] = value;

  // @ts-ignore
  localStorage.setItem(name, JSON.stringify(cache));
};

export const getContractState = async (
  client: Arweave,
  contract: string
): Promise<StateInterface> => {
  // @ts-ignore
  const isBrowser = process.browser;

  if (isBrowser) {
    const latest = await latestInteraction(contract);
    // @ts-ignore
    const cache = JSON.parse(localStorage.getItem("smartweaveCache")) || {};

    if (contract in cache) {
      if (cache[contract].latest === latest) {
        return cache[contract].state;
      }
    }

    const state = await readContract(client, contract);
    updateCache("smartweaveCache", contract, {
      latest,
      state,
    });
    return state;
  } else {
    return await readContract(client, contract);
  }
};
