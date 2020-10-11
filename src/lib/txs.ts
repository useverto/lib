import Arweave from "arweave";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import txsQuery from "../queries/txs.gql";

export const getTransactions = async (
  client: Arweave,
  addr: string
): Promise<
  {
    id: string;
    amount: number;
    type: string;
    status: string;
    timestamp: number;
  }[]
> => {
  let txs: {
    id: string;
    amount: number;
    type: string;
    status: string;
    timestamp: number;
  }[] = [];

  const currentHeight = (await client.network.getInfo()).height;
  const outTxs = (
    await query<EdgeQueryResponse>({
      query: txsQuery,
      variables: {
        owners: [addr],
        block: currentHeight,
      },
    })
  ).data.transactions.edges;
  const inTxs = (
    await query<EdgeQueryResponse>({
      query: txsQuery,
      variables: {
        recipients: [addr],
        block: currentHeight,
      },
    })
  ).data.transactions.edges;

  outTxs.map(({ node }) => {
    txs.push({
      id: node.id,
      amount: parseFloat(parseFloat(node.quantity.ar).toFixed(2)),
      type: "out",
      status: "",
      timestamp: node.block.timestamp,
    });
  });
  inTxs.map(({ node }) => {
    txs.push({
      id: node.id,
      amount: parseFloat(parseFloat(node.quantity.ar).toFixed(2)),
      type: "in",
      status: "",
      timestamp: node.block.timestamp,
    });
  });

  txs.sort((a, b) => b.timestamp - a.timestamp);
  txs = txs.slice(0, 5);

  for (let i = 0; i < txs.length; i++) {
    try {
      const res = await client.transactions.getStatus(txs[i].id);
      if (res.status === 200) txs[i].status = "success";
      else txs[i].status = "pending";
    } catch (error) {
      console.log(error);
    }
  }

  return txs;
};
