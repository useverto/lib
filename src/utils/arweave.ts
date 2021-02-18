import Arweave from "arweave";
import { getContract } from "cacheweave";
import { weightedRandom } from "./weighted_random";
import { query } from "./gql";
import { EdgeQueryResponse } from "types";
import { StateInterface } from "community-js/lib/faces";
import { ethers } from "ethers";

/**
 * Utility to create a general Arweave client instance
 */
export function createGenericClient(): Arweave {
  return new Arweave({
    host: "arweave.net",
    port: 443,
    protocol: "https",
    // Disable the arweave logger
    logging: false,
  });
}

export const selectWeightedHolder = async (
  client: Arweave,
  contract: string
): Promise<string | undefined> => {
  const res = await getContract(client, contract);
  const state = isStateInterfaceWithValidity(res) ? res.state : res;
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

export const getArAddr = async (
  addr: string,
  chain: string,
  checksum: boolean = false
): Promise<string | undefined> => {
  let wallet;

  const txs = (
    await query<EdgeQueryResponse>({
      query: `
        query($addr: [String!]!, $chain: [String!]!) {
          transactions(
            tags: [
              { name: "Application", values: "ArLink" }
              { name: "Chain", values: $chain }
              { name: "Wallet", values: $addr }
            ]
            first: 1
          ) {
            edges {
              node {
                owner {
                  address
                }
              }
            }
          }
        }
      `,
      variables: {
        addr,
        chain,
      },
    })
  ).data.transactions.edges;

  if (txs.length === 1) {
    wallet = txs[0].node.owner.address;
  }

  if (checksum) {
    return wallet;
  } else {
    return (
      wallet || (await getArAddr(ethers.utils.getAddress(addr), chain, true))
    );
  }
};

export const getChainAddr = async (
  addr: string,
  chain: string
): Promise<string | undefined> => {
  let wallet;

  const txs = (
    await query<EdgeQueryResponse>({
      query: `
        query($addr: String!, $chain: [String!]!) {
          transactions(
            owners: [$addr]
            tags: [
              { name: "Application", values: "ArLink" }
              { name: "Chain", values: $chain }
            ]
            first: 1
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
        }
      `,
      variables: {
        addr,
        chain,
      },
    })
  ).data.transactions.edges;

  if (txs.length === 1) {
    const tag = txs[0].node.tags.find(
      (tag: { name: string; value: string }) => tag.name === "Wallet"
    );

    if (tag) {
      wallet = tag.value;
    }
  }

  return wallet;
};

interface StateInterfaceWithValidity {
  state: StateInterface;
  validity: {
    [id: string]: boolean;
  };
}

export function isStateInterfaceWithValidity(
  val: StateInterface | StateInterfaceWithValidity
): val is StateInterfaceWithValidity {
  return (val as StateInterfaceWithValidity).validity !== undefined;
}
