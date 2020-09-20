import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import Transaction from "arweave/node/lib/transaction";

export const createTrade = async (
  client: Arweave,
  keyfile: JWKInterface,
  type: string,
  amnt: number,
  pst: string,
  post: string,
  rate?: number
): Promise<Transaction | undefined> => {
  // TODO(@johnletey): Add fee txs!!!

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

    return tx;
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

    return tx;
  }

  return;
};

export const sendTrade = async (
  client: Arweave,
  keyfile: JWKInterface,
  tx: Transaction
): Promise<void> => {
  await client.transactions.sign(tx, keyfile);
  await client.transactions.post(tx);
};

export const getFee = async (
  client: Arweave,
  tx: Transaction
): Promise<number> => {
  const fee: string = await client.transactions.getPrice(
    parseFloat(tx.data_size),
    tx.target
  );

  return parseFloat(client.ar.winstonToAr(fee));
};
