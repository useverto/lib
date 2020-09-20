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
  let fee, txSize, recipient;

  txSize = parseFloat(tx.data_size);
  recipient = tx.target;
  fee = await client.transactions.getPrice(txSize, recipient);

  return parseFloat(client.ar.winstonToAr(fee));
};
