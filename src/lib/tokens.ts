import Arweave from "arweave";
import { VertoToken } from "types";
import { getData } from "cacheweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { volume } from "./volume";

export const getTokens = async (
  client: Arweave,
  exchangeContract: string,
  exchangeWallet: string
): Promise<VertoToken[]> => {
  const contractIDs: string[] = [exchangeContract];

  // TODO(@johnletey): Use `localPorridge` as well.
  // @ts-ignore
  if (typeof window !== "undefined") {
    // @ts-ignore
    const cache = JSON.parse(localStorage.getItem("tokens") || "[]");

    cache.map((id: string) => contractIDs.push(id));
  }

  const tokens: VertoToken[] = [];
  for (const contractID of contractIDs) {
    const rawContract = await getData(client, contractID);
    const contract = JSON.parse(rawContract);

    const volumeData = await volume(
      client,
      contractID,
      exchangeContract,
      exchangeWallet
    );

    tokens.push({
      id: contractID,
      name: contract.name,
      ticker: contract.ticker,
      volume: volumeData.volume.reduce((a, b) => a + b, 0),
    });
  }

  tokens.sort((a, b) => b.volume - a.volume);

  return tokens;
};

export const saveToken = async (
  client: Arweave,
  contract: string,
  keyfile: JWKInterface,
  exchangeContract: string,
  exchangeWallet: string
): Promise<void> => {
  // TODO(@johnletey): Use `localPorridge` as well.
  // @ts-ignore
  if (typeof window !== "undefined") {
    const tokens = await getTokens(client, exchangeContract, exchangeWallet);

    if (!tokens.find((token) => token.id === contract)) {
      const tags = {
        Exchange: "Verto",
        Type: "Token",
        Contract: contract,
      };

      const tx = await client.createTransaction(
        {
          target: exchangeWallet,
          data: Math.random().toString().slice(-4),
        },
        keyfile
      );
      for (const [key, value] of Object.entries(tags)) {
        tx.addTag(key, value);
      }

      await client.transactions.sign(tx, keyfile);
      await client.transactions.post(tx);

      // @ts-ignore
      const cache = JSON.parse(localStorage.getItem("tokens") || "[]");
      cache.push(contract);
      // @ts-ignore
      localStorage.setItem("tokens", JSON.stringify(cache));
    }
  }
};
