import { VertoToken } from "types";
import Arweave from "arweave";
import { run, tx } from "ar-gql";
import exchangesQuery from "../queries/exchanges.gql";
import { popularTokens, getTokens } from "./tokens";
import moment from "moment";
import swapConfirmationQuery from "../queries/swapConfirmation.gql";
import confirmationQuery from "../queries/confirmation.gql";
import cancelQuery from "../queries/cancel.gql";
import returnQuery from "../queries/return.gql";

const unique = (arr: VertoToken[]): VertoToken[] => {
  const seen: Record<string, boolean> = {};
  return arr.filter((item) => {
    return item.id in seen ? false : (seen[item.id] = true);
  });
};

export const getExchanges = async (
  client: Arweave,
  addr: string,
  exchangeContract: string,
  exchangeWallet: string
): Promise<
  {
    id: string;
    timestamp: string;
    type: string;
    sent: string;
    received: string;
    status: string;
    duration: string;
  }[]
> => {
  const exchanges: {
    id: string;
    timestamp: string;
    type: string;
    sent: string;
    received: string;
    status: string;
    duration: string;
  }[] = [];

  const res = (
    await run(exchangesQuery, {
      addr,
      num: 5,
    })
  ).data.transactions.edges;

  const tokens = unique([
    ...(await popularTokens(client, exchangeWallet)),
    ...(await getTokens(client, exchangeContract, exchangeWallet)),
  ]);

  for (const tx of res) {
    const type = tx.node.tags.find((tag) => tag.name === "Type")?.value;
    const amount = parseFloat(tx.node.quantity.ar);

    if (type) {
      if (type === "Buy") {
        // AR -> TOKEN
        const tokenID = tx.node.tags.find((tag) => tag.name === "Token")?.value;
        const token = tokens.find((token) => token.id === tokenID);

        if (token) {
          exchanges.push({
            id: tx.node.id,
            timestamp: tx.node.block
              ? moment
                  .unix(tx.node.block.timestamp)
                  .format("YYYY-MM-DD hh:mm:ss")
              : "not mined yet",
            type,
            sent: `${amount} AR`,
            received: `??? ${token.ticker}`,
            status: "pending",
            duration: "not completed",
          });
        }
      }

      if (type === "Sell") {
        // TOKEN -> AR
        const tokenID = tx.node.tags.find((tag) => tag.name === "Contract")
          ?.value;
        const token = tokens.find((token) => token.id === tokenID);

        if (token) {
          const input = tx.node.tags.find((tag) => tag.name === "Input")?.value;

          if (input) {
            exchanges.push({
              id: tx.node.id,
              timestamp: tx.node.block
                ? moment
                    .unix(tx.node.block.timestamp)
                    .format("YYYY-MM-DD hh:mm:ss")
                : "not mined yet",
              type,
              sent: `${JSON.parse(input).qty} ${token.ticker}`,
              received: `??? AR`,
              status: "pending",
              duration: "not completed",
            });
          }
        }
      }

      if (type === "Swap") {
        const chain = tx.node.tags.find((tag) => tag.name === "Chain")?.value;
        const hash = tx.node.tags.find((tag) => tag.name === "Hash")?.value;

        if (hash) {
          // CHAIN -> AR/TOKEN
          const value = tx.node.tags.find((tag) => tag.name === "Value")?.value;

          if (value) {
            const tokenID = tx.node.tags.find((tag) => tag.name === "Token")
              ?.value;
            const token = tokens.find((token) => token.id === tokenID);

            exchanges.push({
              id: tx.node.id,
              timestamp: tx.node.block
                ? moment
                    .unix(tx.node.block.timestamp)
                    .format("YYYY-MM-DD hh:mm:ss")
                : "not mined yet",
              type,
              sent: `${value} ${chain}`,
              received: `??? ${token ? token.ticker : "AR"}`,
              status: "pending",
              duration: "not completed",
            });
          }
        } else {
          // AR -> CHAIN
          exchanges.push({
            id: tx.node.id,
            timestamp: tx.node.block
              ? moment
                  .unix(tx.node.block.timestamp)
                  .format("YYYY-MM-DD hh:mm:ss")
              : "not mined yet",
            type,
            sent: `${amount} AR`,
            received: `??? ${chain}`,
            status: "pending",
            duration: "not completed",
          });
        }
      }
    }
  }

  // Check for confirmations
  for (let i = 0; i < exchanges.length; i++) {
    const entry = exchanges[i];
    let res;

    if (entry.type === "Swap") {
      if (entry.sent.split(" ")[1] === "AR") {
        // AR -> CHAIN
        res = (await run(swapConfirmationQuery, { txID: entry.id })).data
          .transactions.edges[0];
      } else {
        // CHAIN -> AR/TOKEN
        res = (
          await run(
            entry.received.split(" ")[1] === "AR"
              ? swapConfirmationQuery
              : confirmationQuery,
            {
              txID: (await tx(entry.id)).tags.find((tag) => tag.name === "Hash")
                ?.value,
            }
          )
        ).data.transactions.edges[0];
      }
    } else {
      res = (await run(confirmationQuery, { txID: entry.id })).data.transactions
        .edges[0];
    }

    if (res) {
      const received = res.node.tags.find((tag) => tag.name === "Received")
        ?.value;

      if (received) {
        exchanges[i].status = "success";
        exchanges[i].received = received;

        if (res.node.block) {
          const start = moment(exchanges[i].timestamp);
          const end = moment(
            moment.unix(res.node.block.timestamp).format("YYYY-MM-DD hh:mm:ss")
          );
          const duration = moment.duration(end.diff(start));

          exchanges[i].duration = duration.humanize();
        } else {
          exchanges[i].duration = "not mined yet";
        }
      }
    }
  }

  // Check for cancels
  for (let i = 0; i < exchanges.length; i++) {
    const entry = exchanges[i];
    const res = (
      await run(cancelQuery, {
        txID: entry.id,
      })
    ).data.transactions.edges[0];

    if (res) {
      exchanges[i].status = "failed";
      exchanges[i].duration = "cancelled";
    }
  }

  // Check for returns
  for (let i = 0; i < exchanges.length; i++) {
    const entry = exchanges[i];
    const res = (
      await run(returnQuery, {
        return: `${entry.type}-Return`,
        order: entry.id,
      })
    ).data.transactions.edges[0];

    if (res) {
      exchanges[i].status = "failed";
      exchanges[i].duration = "returned";
    }
  }

  return exchanges;
};
