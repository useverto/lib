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

  const IDs: { type: string; id: string }[] = [];
  tokenTxs.map((tx) => IDs.push({ type: "tx", id: tx.node.id }));

  const storage =
    // @ts-ignore
    typeof localStorage == "undefined"
      ? new localPorridge("./.cache.json")
      : // @ts-ignore
        localStorage;
  const cache = JSON.parse(storage.getItem("customTokens") || "[]");
  cache.map((entry: string) => IDs.push({ type: "contract", id: entry }));
  const tokens: VertoToken[] = [];
  for (const entry of IDs) {
    const contractID =
      entry.type === "contract" ? entry.id : await getData(client, entry.id);
    const rawContract = await getData(client, contractID);
    const contract = JSON.parse(rawContract);

    tokens.push({
      id: contractID,
      name: contract.name,
      ticker: contract.ticker,
    });
  }

  return tokens;
};
