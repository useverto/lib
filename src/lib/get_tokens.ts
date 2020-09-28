import { exchangeContractSrc, exchangeWallet } from "@utils/constants";
import { query } from "@utils/gql";
import tokensQuery from "../queries/tokens.gql";
import { getTxData } from "@utils/arweave";
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
      },
    })
  ).data.transactions.edges;

  const txIDs: string[] = [];
  tokenTxs.map((tx) => txIDs.push(tx.node.id));

  const tokens: VertoToken[] = [];
  for (const id of txIDs) {
    const contractId = await getTxData(client, id);
    const rawContractData = await getTxData(client, contractId);
    const contractData = JSON.parse(rawContractData);

    tokens.push({
      id: contractId,
      name: contractData.name,
      ticker: contractData.ticker,
    });
  }

  return tokens;
};
