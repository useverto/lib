import Arweave from "arweave";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import genesisQuery from "../queries/genesis.gql";
import { exchangeWallet } from "@utils/constants";
import Transaction from "arweave/node/lib/transaction";

const getTradingPostFee = async (
  client: Arweave,
  post: string
): Promise<number> => {
  const txID = (
    await query<EdgeQueryResponse>({
      query: genesisQuery,
      variables: {
        owners: [post],
        recipients: [exchangeWallet],
      },
    })
  ).data.transactions.edges[0]?.node.id;

  const config = JSON.parse(
    (
      await client.transactions.getData(txID, { decode: true, string: true })
    ).toString()
  );

  return config["tradeFee"];
};

export const getTxFee = async (
  client: Arweave,
  tx: Transaction
): Promise<number> => {
  const fee: string = await client.transactions.getPrice(
    parseFloat(tx.data_size),
    tx.target
  );

  return parseFloat(client.ar.winstonToAr(fee));
};
