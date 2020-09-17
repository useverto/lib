import { exchangeContractSrc, exchangeWallet } from "@utils/constants";
import { query } from "@utils/gql";
import tokensQuery from "../queries/tokens.gql";
import { createGenericClient, getTxData } from "@utils/arweave";
import Arweave from "arweave";
import { VertoToken, EdgeQueryResponse } from "types";

const client: Arweave = createGenericClient();

export const getTokens = async (
  contractSrc?: string
): Promise<VertoToken[]> => {
  if (!contractSrc) contractSrc = exchangeContractSrc;
  const tokenTxs = (
    await query<EdgeQueryResponse>({
      query: tokensQuery,
      variables: {
        owners: [exchangeWallet],
        contractSrc,
      },
    })
  ).data.transactions.edges;

  const txIDs: string[] = [];
  tokenTxs.map((tx) => txIDs.push(tx.node.id));

  const tokens: VertoToken[] = [];
  for (const id of txIDs) {
    const contractId = await getTxData(client, id);
    const rawcontractData = await getTxData(client, contractId);
    const contractData = JSON.parse(rawcontractData);

    tokens.push({
      id: contractId,
      ticker: contractData.ticker,
    });
  }

  return tokens;
};
