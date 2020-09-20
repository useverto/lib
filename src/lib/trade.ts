import Arweave from "arweave";
import Transaction from "arweave/node/lib/transaction";

export const createTrade = async () => {
  // TODO
};

export const sendTrade = async () => {
  // TODO
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
