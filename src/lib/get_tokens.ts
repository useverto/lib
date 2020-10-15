import { exchangeContractSrc, exchangeWallet, maxInt } from "@utils/constants";
import { query } from "@utils/gql";
import tokensQuery from "../queries/tokens.gql";
import { getData } from "cacheweave";
import Arweave from "arweave";
import { VertoToken, EdgeQueryResponse } from "types";

export const getTokens = async (
  client: Arweave,
  contractSrc?: string
): Promise<VertoToken[]> => {
  if (!contractSrc) contractSrc = exchangeContractSrc;
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
