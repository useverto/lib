import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import Transaction from "arweave/node/lib/transaction";
import { exchangeFee } from "@utils/constants";
import { selectWeightedHolder } from "@utils/arweave";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import genesisQuery from "../queries/genesis.gql";

export const createExchangeFeeTx = async (
  client: Arweave,
  keyfile: JWKInterface | "use_wallet" | undefined,
  amnt: number,
  exchangeWallet: string
): Promise<Transaction> => {
  const tags = {
    Exchange: "Verto",
    Type: "Fee-Exchange",
  };
  const fee = amnt * exchangeFee;

  const tx = await client.createTransaction(
    {
      target: exchangeWallet,
      quantity: client.ar.arToWinston(fee.toString()),
    },
    keyfile
  );

  for (const [key, value] of Object.entries(tags)) {
    tx.addTag(key, value);
  }

  return tx;
};

export const createTradingPostFeeTx = async (
  client: Arweave,
  keyfile: JWKInterface | "use_wallet" | undefined,
  amnt: number,
  pst: string,
  post: string,
  exchangeWallet: string
): Promise<Transaction> => {
  const tradingPostFee = Math.floor(
    Math.floor(amnt) * (await getTradingPostFee(client, post, exchangeWallet))
  );

  const tags = {
    Exchange: "Verto",
    Type: "Fee-Trading-Post",
    "App-Name": "SmartWeaveAction",
    "App-Version": "0.3.0",
    Contract: pst,
    Input: JSON.stringify({
      function: "transfer",
      target: post,
      qty: tradingPostFee,
    }),
  };
  const tx = await client.createTransaction(
    {
      target: post,
      data: Math.random().toString().slice(-4),
    },
    keyfile
  );

  for (const [key, value] of Object.entries(tags)) {
    tx.addTag(key, value);
  }

  return tx;
};

export const createVRTHolderFeeTx = async (
  client: Arweave,
  keyfile: JWKInterface | "use_wallet" | undefined,
  amnt: number,
  pst: string,
  exchangeContract: string
): Promise<Transaction> => {
  const tipReceiver = await selectWeightedHolder(client, exchangeContract);

  const fee = Math.floor(Math.floor(amnt) * exchangeFee);

  const tags = {
    Exchange: "Verto",
    Type: "Fee-VRT-Holder",
    "App-Name": "SmartWeaveAction",
    "App-Version": "0.3.0",
    Contract: pst,
    Input: JSON.stringify({
      function: "transfer",
      target: tipReceiver,
      qty: fee,
    }),
  };

  const tx = await client.createTransaction(
    {
      target: tipReceiver,
      data: Math.random().toString().slice(-4),
    },
    keyfile
  );

  for (const [key, value] of Object.entries(tags)) {
    tx.addTag(key, value);
  }

  return tx;
};

export const getTradingPostFee = async (
  client: Arweave,
  post: string,
  exchangeWallet: string
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

  return config.tradeFee;
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
