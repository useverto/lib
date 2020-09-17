import { exchangeContractSrc, exchangeWallet } from "@utils/constants";
import { query } from "@utils/gql";
import tokensQuery from "./queries/tokens.gql";
import { createGenericClient } from "@utils/arweave";
import Arweave from "arweave";
import { VertoToken } from "types";

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
  tokenTxs.map((tx: any) => {
    txIDs.push(tx.node.id);
  });

  let tokens: VertoToken[] = [];
  for (const id of txIDs) {
    const contractId = (
      await client.transactions.getData(id, { decode: true, string: true })
    ).toString();
    const contractData = JSON.parse(
      (
        await client.transactions.getData(contractId, {
          decode: true,
          string: true,
        })
      ).toString()
    );

    tokens.push({
      id: contractId,
      ticker: contractData.ticker,
    });
  }

  return tokens;
};
