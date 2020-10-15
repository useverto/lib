import Arweave from "arweave";
import { getTokens } from "./get_tokens";
import { getContract } from "cacheweave";

export const getAssets = async (
  client: Arweave,
  addr: string
): Promise<{ id: string; name: string; ticker: string; balance: number }[]> => {
  const tokens = await getTokens(client);

  const balances: {
    id: string;
    name: string;
    ticker: string;
    balance: number;
  }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const contract = await getContract(client, tokens[i].id);

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
