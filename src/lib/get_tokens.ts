import { exchangeContractSrc, exchangeWallet } from "@utils/constants";
import { query } from "@utils/gql";
import tokensQuery from "../queries/tokens.gql";
import { createGenericClient, getTxData } from "@utils/arweave";
import Arweave from "arweave";
import { VertoToken } from "types";
import Transaction from "arweave/node/lib/transaction";

const client: Arweave = createGenericClient();

export const getTokens = async (contractSrc?: string) => {
  if (!contractSrc) contractSrc = exchangeContractSrc;
  const tokenTxs = (
    await query({
      query: tokensQuery,
      variables: {
        owners: [exchangeWallet],
        contractSrc,
      },
    })
  ).data.transactions.edges;

  let txIDs: string[] = [];
  tokenTxs.map((tx: Transaction) => txIDs.push(tx.node.id));

  let tokens: VertoToken[] = [];
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
