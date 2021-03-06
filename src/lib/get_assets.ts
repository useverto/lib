import Arweave from "arweave";
import { VertoToken } from "types";
import { popularTokens, getTokens } from "./tokens";
import axios from "axios";
import { getContract } from "cacheweave";

const unique = (arr: VertoToken[]): VertoToken[] => {
  const seen: Record<string, boolean> = {};
  return arr.filter((item) => {
    return item.id in seen ? false : (seen[item.id] = true);
  });
};

export const getAssets = async (
  client: Arweave,
  addr: string,
  useCache: boolean,
  exchangeContract: string,
  exchangeWallet: string
): Promise<{ id: string; name: string; ticker: string; balance: number }[]> => {
  const tokens = unique([
    ...(await popularTokens(client, exchangeWallet)),
    ...(await getTokens(client, useCache, exchangeContract)),
  ]);

  const balances: {
    id: string;
    name: string;
    ticker: string;
    balance: number;
    state: any;
  }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    let contract: any;
    if (useCache) {
      const { data } = await axios.get(
        `https://cache.verto.exchange/${tokens[i].id}`
      );
      contract = data.state;
    } else {
      contract = await getContract(client, tokens[i].id);
    }

    if (contract.balances && contract.balances[addr] > 0) {
      balances.push({
        id: tokens[i].id,
        name: tokens[i].name,
        ticker: tokens[i].ticker,
        balance: contract.balances[addr],
        state: contract,
      });
    }
  }

  balances.sort((a, b) => {
    return b.balance - a.balance;
  });

  return balances;
};
