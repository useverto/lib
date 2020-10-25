import Arweave from "arweave";
import { VertoToken } from "types";
import { getData } from "cacheweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { volume } from "./volume";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import tokensQuery from "../queries/tokens.gql";
import tokenQuery from "../queries/token.gql";

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

  const tokens: {
    id: string;
    name: string;
    ticker: string;
    volume: number;
  }[] = [];
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

export const popularTokens = async (
  client: Arweave,
  exchangeWallet: string
): Promise<VertoToken[]> => {
  const tokensTxs = (
    await query<EdgeQueryResponse>({
      query: tokensQuery,
      variables: {
        exchange: exchangeWallet,
      },
    })
  ).data.transactions.edges;

  const tokens: {
    id: string;
    name: string;
    ticker: string;
    amnt: number;
  }[] = [];
  tokensTxs.map(({ node }) => {
    const idTag = node.tags.find((tag) => tag.name === "Contract");
    if (idTag) {
      const id = idTag.value;
      if (!tokens.find((entry) => entry.id === id)) {
        tokens.push({
          id,
          name: "",
          ticker: "",
          amnt: 0,
        });
      }
    }
  });

  for (let i = 0; i < tokens.length; i++) {
    const rawContract = await getData(client, tokens[i].id);
    const contract = JSON.parse(rawContract);

    tokens[i].name = contract.name;
    tokens[i].ticker = contract.ticker;

    tokens[i].amnt = (
      await query<EdgeQueryResponse>({
        query: tokenQuery,
        variables: {
          exchange: exchangeWallet,
          contract: tokens[i].id,
        },
      })
    ).data.transactions.edges.length;
  }

  tokens.sort((a, b) => b.amnt - a.amnt);

  return tokens;
};
