import { VertoToken } from "types";
import Arweave from "arweave";
import { GQLEdgeInterface } from "ar-gql/dist/types";
import { popularTokens, getTokens } from "./tokens";
import moment from "moment";
import { run, tx } from "ar-gql";
import confirmationSwapQuery from "../queries/swapConfirmation.gql";
import confirmationTradeQuery from "../queries/confirmation.gql";
import cancelQuery from "../queries/cancel.gql";
import returnQuery from "../queries/return.gql";
import exchangesQuery from "../queries/exchanges.gql";
import exchangesCursorQuery from "../queries/exchanges_cursor.gql";
import { getConfig } from "./get_config";
import fetch from "node-fetch";

const unique = (arr: VertoToken[]): VertoToken[] => {
  const seen: Record<string, boolean> = {};
  return arr.filter((item) => {
    return item.id in seen ? false : (seen[item.id] = true);
  });
};

export interface Exchange {
  id: string;
  timestamp: string;
  type: string;
  sent: string;
  received: string;
  status: string;
  duration: string;
}

export interface OrderBookItem {
  token: string;
  orders: {
    txID: string;
    amnt: number;
    rate?: number;
    addr: string;
    type: "Buy" | "Sell";
    createdAt: Date;
    received: number;
    token?: string;
  }[];
}

export const parseExchange = async (
  client: Arweave,
  edge: GQLEdgeInterface,
  exchangeContract: string,
  exchangeWallet: string
): Promise<Exchange | undefined> => {
  const tokens = unique([
    ...(await popularTokens(client, exchangeWallet)),
    ...(await getTokens(client, exchangeContract, exchangeWallet)),
  ]);

  let res: Exchange | undefined;

  const type = edge.node.tags.find((tag) => tag.name === "Type")?.value;
  const amount = parseFloat(edge.node.quantity.ar);

  if (type) {
    if (type === "Buy") {
      // AR -> TOKEN
      const tokenID = edge.node.tags.find((tag) => tag.name === "Token")?.value;
      const token = tokens.find((token) => token.id === tokenID);

      if (token) {
        res = {
          id: edge.node.id,
          timestamp: edge.node.block
            ? moment
                .unix(edge.node.block.timestamp)
                .format("YYYY-MM-DD HH:mm:ss")
            : "not mined yet",
          type,
          sent: `${amount} AR`,
          received: `??? ${token.ticker}`,
          status: "pending",
          duration: "not completed",
        };
      }
    }

    if (type === "Sell") {
      // TOKEN -> AR
      const tokenID = edge.node.tags.find((tag) => tag.name === "Contract")
        ?.value;
      const token = tokens.find((token) => token.id === tokenID);

      if (token) {
        const input = edge.node.tags.find((tag) => tag.name === "Input")?.value;

        if (input) {
          res = {
            id: edge.node.id,
            timestamp: edge.node.block
              ? moment
                  .unix(edge.node.block.timestamp)
                  .format("YYYY-MM-DD HH:mm:ss")
              : "not mined yet",
            type,
            sent: `${JSON.parse(input).qty} ${token.ticker}`,
            received: `??? AR`,
            status: "pending",
            duration: "not completed",
          };
        }
      }
    }

    if (type === "Swap") {
      const chain = edge.node.tags.find((tag) => tag.name === "Chain")?.value;
      const hash = edge.node.tags.find((tag) => tag.name === "Hash")?.value;

      if (hash) {
        // CHAIN -> AR/TOKEN
        const value = edge.node.tags.find((tag) => tag.name === "Value")?.value;

        if (value) {
          const tokenID = edge.node.tags.find((tag) => tag.name === "Token")
            ?.value;
          const token = tokens.find((token) => token.id === tokenID);

          res = {
            id: edge.node.id,
            timestamp: edge.node.block
              ? moment
                  .unix(edge.node.block.timestamp)
                  .format("YYYY-MM-DD HH:mm:ss")
              : "not mined yet",
            type,
            sent: `${value} ${chain}`,
            received: `??? ${token ? token.ticker : "AR"}`,
            status: "pending",
            duration: "not completed",
          };
        }
      } else {
        // AR -> CHAIN
        res = {
          id: edge.node.id,
          timestamp: edge.node.block
            ? moment
                .unix(edge.node.block.timestamp)
                .format("YYYY-MM-DD HH:mm:ss")
            : "not mined yet",
          type,
          sent: `${amount} AR`,
          received: `??? ${chain}`,
          status: "pending",
          duration: "not completed",
        };
      }
    }
  }

  if (res) {
    // Check for confirmations
    let confirmationRes;
    if (res.type === "Swap") {
      if (res.sent.split(" ")[1] === "AR") {
        // AR -> CHAIN
        confirmationRes = (await run(confirmationSwapQuery, { txID: res.id }))
          .data.transactions.edges[0];
      } else {
        // CHAIN -> AR/TOKEN
        confirmationRes = (
          await run(
            res.received.split(" ")[1] === "AR"
              ? confirmationSwapQuery
              : confirmationTradeQuery,
            {
              txID: (await tx(res.id)).tags.find((tag) => tag.name === "Hash")
                ?.value,
            }
          )
        ).data.transactions.edges[0];
      }
    } else {
      confirmationRes = (await run(confirmationTradeQuery, { txID: res.id }))
        .data.transactions.edges[0];
    }

    if (confirmationRes) {
      const received = confirmationRes.node.tags.find(
        (tag) => tag.name === "Received"
      )?.value;

      if (received) {
        res.status = "success";
        res.received = received;

        if (confirmationRes.node.block) {
          const start = moment(res.timestamp);
          const end = moment(
            moment
              .unix(confirmationRes.node.block.timestamp)
              .format("YYYY-MM-DD HH:mm:ss")
          );
          const duration = moment.duration(end.diff(start));

          res.duration = duration.humanize();
        } else {
          res.duration = "not mined yet";
        }
      }
    }

    // Check for cancels
    const cancelRes = (
      await run(cancelQuery, {
        txID: res.id,
      })
    ).data.transactions.edges[0];

    if (cancelRes) {
      res.status = "failed";
      res.duration = "cancelled";
    }

    // Check for returns
    const returnRes = (
      await run(returnQuery, {
        return: `${res.type}-Return`,
        order: res.id,
      })
    ).data.transactions.edges[0];

    if (returnRes) {
      res.status = "failed";
      res.duration = "returned";
    }
  }

  return res;
};

export const getExchanges = async (
  client: Arweave,
  addr: string,
  exchangeContract: string,
  exchangeWallet: string
): Promise<Exchange[]> => {
  const exchanges: Exchange[] = [];

  const res = (
    await run(exchangesQuery, {
      addr,
      num: 5,
    })
  ).data.transactions.edges;

  for (const edge of res) {
    const exchange = await parseExchange(
      client,
      edge,
      exchangeContract,
      exchangeWallet
    );

    if (exchange) {
      exchanges.push(exchange);
    }
  }

  return exchanges;
};

export const paginateExchanges = async (
  client: Arweave,
  addr: string,
  exchangeContract: string,
  exchangeWallet: string,
  cursor?: string
): Promise<{ exchanges: Exchange[]; cursor?: string }> => {
  const exchanges: Exchange[] = [];

  const {
    edges,
    pageInfo: { hasNextPage },
  } = (
    await run(exchangesCursorQuery, {
      addr,
      cursor,
    })
  ).data.transactions;

  if (edges.length < 1) return { exchanges: [], cursor: undefined };

  for (const edge of edges) {
    const exchange = await parseExchange(
      client,
      edge,
      exchangeContract,
      exchangeWallet
    );

    if (exchange) {
      exchanges.push(exchange);
    }
  }

  return {
    exchanges,
    cursor: hasNextPage ? undefined : edges[edges.length - 1].cursor,
  };
};

export const getOrderBook = async (
  client: Arweave,
  post: string,
  exchangeWallet: string
): Promise<OrderBookItem[]> => {
  const config = await getConfig(client, post, exchangeWallet);

  if (config === "invalid") throw new Error("Invalid genesis");

  // @ts-ignore
  const url = config["publicURL"].startsWith("https://")
      ? // @ts-ignore
        config["publicURL"]
      : // @ts-ignore
        "https://" + config["publicURL"],
    endpoint = url.endsWith("/") ? "orders" : "/orders";

  try {
    const res: OrderBookItem[] = await (await fetch(url + endpoint))
      .clone()
      .json();
    return res;
  } catch {
    throw new Error("Could not get orderbook");
  }
};
