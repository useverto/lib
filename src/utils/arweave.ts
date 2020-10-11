import Arweave from "arweave";
import { updateCache, getContractState } from "./cache";
import { weightedRandom } from "./weighted_random";

/**
 * Utility to create a general Arweave client instance
 */
export function createGenericClient(): Arweave {
  return new Arweave({
    host: "arweave.dev",
    port: 443,
    protocol: "https",
    // Disable the arweave logger
    logging: false,
  });
}

/**
 * Pull transaction data from Arweave
 * @param client An arweave client instance
 * @param id txID of the transaction
 */
export async function getTxData(client: Arweave, id: string): Promise<string> {
  // @ts-ignore
  const isBrowser = process.browser;

  if (isBrowser) {
    // @ts-ignore
    const cache = JSON.parse(localStorage.getItem("dataCache")) || {};

    if (id in cache) {
      return cache[id];
    }
  }

  const buf: string | Uint8Array = await client.transactions.getData(id, {
    decode: true,
    string: true,
  });

  if (isBrowser) updateCache("dataCache", id, buf.toString());

  return buf.toString();
}

export const selectWeightedHolder = async (
  client: Arweave,
  contract: string
): Promise<string | undefined> => {
  const state = await getContractState(client, contract);
  const balances = state.balances;
  const vault = state.vault;

  let totalTokens = 0;
  for (const addr of Object.keys(balances)) {
    totalTokens += balances[addr];
  }

  for (const addr of Object.keys(vault)) {
    if (!vault[addr].length) continue;

    const vaultBalance = vault[addr]
      .map((a) => a.balance)
      .reduce((a, b) => a + b, 0);
    totalTokens += vaultBalance;
    if (addr in balances) {
      balances[addr] += vaultBalance;
    } else {
      balances[addr] = vaultBalance;
    }
  }

  const weighted: { [addr: string]: number } = {};
  for (const addr of Object.keys(balances)) {
    weighted[addr] = balances[addr] / totalTokens;
  }

  return weightedRandom(weighted);
};
