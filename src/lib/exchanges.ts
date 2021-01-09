import Arweave from "arweave";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import exchangesQuery from "../queries/exchanges.gql";
import swapsQuery from "../queries/swaps.gql";
import { getTokens } from "./tokens";
import moment from "moment";
import confirmationQuery from "../queries/confirmation.gql";
import swapConfirmationQuery from "../queries/swapConfirmation.gql";
import cancelQuery from "../queries/cancel.gql";

export const getExchanges = async (
  client: Arweave,
  addr: string,
  exchangeContract: string,
  exchangeWallet: string,
  num: number,
  cursor?: {
    swaps?: string,
    exchanges?: string
  }
): Promise<{
  exchanges: {
    id: string;
    timestamp: string;
    type: string;
    sent: string;
    received: string;
    status: string;
    duration: string;
  }[];
  cursor: {
    swaps?: string;
    exchanges?: string;
  };
}> => {
  const exchanges: {
    id: string;
    timestamp: string;
    type: string;
    sent: string;
    received: string;
    status: string;
    duration: string;
  }[] = [];

  let cursors: { swaps?: string, exchanges?: string } = {};

  const variables = {
      owners: [addr],
      num,
    },
    txsData = (
      await query<EdgeQueryResponse>({
        query: exchangesQuery,
        variables: cursor && cursor.exchanges ? { ...variables, cursor: cursor.exchanges } : variables,
      })
    ).data.transactions,
    txs = txsData.edges,
    txsHasNext = txsData.pageInfo.hasNextPage;

  const psts = await getTokens(client, exchangeContract, exchangeWallet);

  txs.map(({ node, cursor }) => {
    if(txsHasNext) cursors = { ...cursors, exchanges: cursor };
    const type = node.tags.find((tag) => tag.name === "Type")?.value;
    if (type) {
      const tokenTag = type === "Buy" ? "Token" : "Contract";
      const token = node.tags.find(
        (tag: { name: string; value: string }) => tag.name === tokenTag
      )?.value;
      const ticker = psts.find((pst) => pst.id === token)?.ticker;

      const sent =
        type === "Buy"
          ? parseFloat(node.quantity.ar) + " AR"
          : JSON.parse(
              node.tags.find(
                (tag: { name: string; value: string }) => tag.name === "Input"
              )?.value || ""
            )["qty"] +
            " " +
            ticker;
      const received = "??? " + (type === "Buy" ? ticker : "AR");

      exchanges.push({
        id: node.id,
        timestamp: node.block
          ? moment.unix(node.block.timestamp).format("YYYY-MM-DD hh:mm:ss")
          : "not mined yet",
        type,
        sent,
        received,
        status: "pending",
        duration: "not completed",
      });
    }
  });

  //

  const swapVariables = {
    owners: [addr],
    num,
  },
  swapTxsData = (
    await query<EdgeQueryResponse>({
      query: swapsQuery,
      variables: cursor && cursor.swaps ? {...swapVariables, cursor: cursor.swaps } : swapVariables,
    })
  ).data.transactions,
  swapTxs = swapTxsData.edges,
  swapHasNext = swapTxsData.pageInfo.hasNextPage;  

  swapTxs.map(({ node, cursor }) => {
    if(swapHasNext) cursors = { ...cursors, swaps: cursor };    
    const chain = node.tags.find((tag) => tag.name === "Chain")?.value;
    const hash = node.tags.find((tag) => tag.name === "Hash")?.value;
    if (chain) {
      if (hash) {
        exchanges.push({
          id: node.id,
          timestamp: node.block
            ? moment.unix(node.block.timestamp).format("YYYY-MM-DD hh:mm:ss")
            : "not mined yet",
          type: "",
          sent:
            node.tags.find((tag) => tag.name === "Value")?.value + " " + chain,
          received: "??? AR",
          status: "pending",
          duration: "not completed",
        });
      } else {
        exchanges.push({
          id: node.id,
          timestamp: node.block
            ? moment.unix(node.block.timestamp).format("YYYY-MM-DD hh:mm:ss")
            : "not mined yet",
          type: "",
          sent: parseFloat(node.quantity.ar) + " AR",
          received: "??? " + chain,
          status: "pending",
          duration: "not completed",
        });
      }
    }
  });

  //

  for (let i = 0; i < exchanges.length; i++) {
    let match = (
      await query<EdgeQueryResponse>({
        query: confirmationQuery,
        variables: {
          txID: exchanges[i].id,
        },
      })
    ).data.transactions.edges;
    if (!match[0]) {
      match = (
        await query<EdgeQueryResponse>({
          query: swapConfirmationQuery,
          variables: {
            txID: exchanges[i].id,
          },
        })
      ).data.transactions.edges;
    }

    if (match[0]) {
      exchanges[i].status = "success";

      if (match[0].node.block) {
        const start = moment(exchanges[i].timestamp);
        const end = moment(
          moment
            .unix(match[0].node.block.timestamp)
            .format("YYYY-MM-DD hh:mm:ss")
        );
        const duration = moment.duration(end.diff(start));

        exchanges[i].duration = duration.humanize();
      } else {
        exchanges[i].duration = "not mined yet";
      }

      const receivedTag = match[0].node.tags.find(
        (tag: { name: string; value: string }) => tag.name === "Received"
      );
      if (receivedTag) {
        const received = receivedTag.value.split(" ");
        exchanges[i].received =
          parseFloat(parseFloat(received[0]).toFixed(5)) + " " + received[1];
      }
    }

    const cancel = (
      await query<EdgeQueryResponse>({
        query: cancelQuery,
        variables: {
          txID: exchanges[i].id,
        },
      })
    ).data.transactions.edges;

    if (cancel[0]) {
      exchanges[i].status = "failed";
      exchanges[i].duration = "cancelled";
    }
  }

  return {
    exchanges: exchanges
      .sort((a, b) => {
        return moment(b.timestamp).unix() - moment(a.timestamp).unix();
      })
      .slice(0, num),
    cursor: cursors,
  };
};
