import { exchangeContractSrc, exchangeWallet } from "@utils/constants";
import Arweave from "arweave";
import { query } from "@utils/gql";
import tokensQuery from "./queries/tokens.gql";

export const getTokens = async (contractSrc?: string) => {
  if (!contractSrc) contractSrc = exchangeContractSrc;

  const client = new Arweave({
    host: "arweave.dev",
    port: 443,
    protocol: "https",
  });

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

  let tokens: { id: string; ticker: string }[] = [];
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
