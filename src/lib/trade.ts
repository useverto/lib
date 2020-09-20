import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import Transaction from "arweave/node/lib/transaction";
import {
  createExchangeFeeTx,
  createTradingPostFeeTx,
  createVRTHolderFeeTx,
  getTradingPostFee,
  getTxFee,
} from "./fees";
import { exchangeFee } from "@utils/constants";

export const createOrder = async (
  client: Arweave,
  keyfile: JWKInterface,
  type: string,
  amnt: number,
  pst: string,
  post: string,
  rate?: number
): Promise<{ txs: Transaction[]; ar: number; pst: number } | undefined> => {
  if (type.toLowerCase() === "buy") {
    const tags = {
      Exchange: "Verto",
      Type: "Buy",
      Token: pst,
    };

    const tx = await client.createTransaction(
      {
        target: post,
        quantity: client.ar.arToWinston(amnt.toString()),
      },
      keyfile
    );

    for (const [key, value] of Object.entries(tags)) {
      tx.addTag(key, value);
    }

    const exchangeFeeTx = await createExchangeFeeTx(client, keyfile, amnt);
    const txFees =
      (await getTxFee(client, tx)) + (await getTxFee(client, exchangeFeeTx));

    return {
      txs: [tx, exchangeFeeTx],
      ar: txFees + amnt + amnt * exchangeFee,
      pst: 0,
    };
  }

  if (type.toLowerCase() === "sell" && rate) {
    const tags = {
      Exchange: "Verto",
      Type: "Sell",
      "App-Name": "SmartWeaveAction",
      "App-Version": "0.3.0",
      Contract: pst,
      Rate: 1 / rate,
      Input: `{"function":"transfer","target":"${post}","qty":${Math.ceil(
        amnt
      )}}`,
    };

    const tx = await client.createTransaction(
      {
        target: post,
        data: Math.random().toString().slice(-4),
      },
      keyfile
    );

    for (const [key, value] of Object.entries(tags)) {
      tx.addTag(key, value.toString());
    }

    //

    const tradingPostFeeTx = await createTradingPostFeeTx(
      client,
      keyfile,
      amnt,
      pst,
      post
    );
    const VRTHolderFeeTx = await createVRTHolderFeeTx(
      client,
      keyfile,
      amnt,
      pst
    );

    //

    return {
      txs: [tx, tradingPostFeeTx, VRTHolderFeeTx],
      ar:
        (await getTxFee(client, tx)) +
        ((await getTxFee(client, tradingPostFeeTx)) +
          (await getTxFee(client, VRTHolderFeeTx))),
      pst:
        Math.ceil(amnt) +
        Math.ceil(Math.ceil(amnt) * (await getTradingPostFee(client, post))) +
        Math.ceil(Math.ceil(amnt) * exchangeFee),
    };
  }

  return;
};

export const sendOrder = async (
  client: Arweave,
  keyfile: JWKInterface,
  txs: Transaction[]
): Promise<void> => {
  for (const tx of txs) {
    await client.transactions.sign(tx, keyfile);
    await client.transactions.post(tx);
  }
};
