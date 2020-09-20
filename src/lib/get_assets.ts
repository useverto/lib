import Arweave from "arweave";
import { getTokens } from "./get_tokens";
import { interactRead } from "smartweave";

export const getAssets = async (
  client: Arweave,
  addr: string
): Promise<{ id: string; ticker: string; balance: number }[]> => {
  const tokens = await getTokens(client);

  const balances: { id: string; ticker: string; balance: number }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const contract = await interactRead(
      client,
      await client.wallets.generate(),
      tokens[i].id,
      {
        target: addr,
        function: "unlockedBalance",
      }
    );

    if (contract.balance && contract.balance > 0) {
      balances.push({
        id: tokens[i].id,
        ticker: tokens[i].ticker,
        balance: contract.balance,
      });
    }
  }

  balances.sort((a, b) => {
    return b.balance - a.balance;
  });

  return balances;
};
