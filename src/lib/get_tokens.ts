import { query } from "@utils/gql";
import tokensQuery from "../queries/tokens.gql";
import { maxInt } from "@utils/constants";
import { getData } from "cacheweave";
import Arweave from "arweave";
import { VertoToken, EdgeQueryResponse } from "types";
import localPorridge from "localporridge";

export const getTokens = async (
  client: Arweave,
  exchangeContract: string,
  exchangeWallet: string,
  contractSrc?: string
): Promise<VertoToken[]> => {
  if (!contractSrc) contractSrc = exchangeContract;
  const tokenTxs = (
    await query<EdgeQueryResponse>({
      query: tokensQuery,
      variables: {
        owners: [exchangeWallet],
        contractSrc,
        num: maxInt,
      },
    })
  ).data.transactions.edges;

  const txIDs: string[] = [];
  tokenTxs.map((tx) => txIDs.push(tx.node.id));

  const storage =
    // @ts-ignore
    typeof localStorage === "undefined"
      ? new localPorridge("./.cache.json")
      : // @ts-ignore
        localStorage;
  const cache = JSON.parse(storage.getItem("customTokens") || "[]");
  cache.map((token: string) => txIDs.push(token));

  const tokens: VertoToken[] = [];
  for (const id of txIDs) {
    const contractId = await getData(client, id);
    const rawContractData = await getData(client, contractId);
    const contractData = JSON.parse(rawContractData);

    tokens.push({
      id: contractId,
      name: contractData.name,
      ticker: contractData.ticker,
    });
  }

  return tokens;
};
