import { VertoToken } from "types";
import Arweave from "arweave";
import { GQLEdgeInterface, GQLNodeInterface } from "ar-gql/dist/types";
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
import { getContract } from "cacheweave";
import { isStateInterfaceWithValidity } from "../utils/arweave";

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

export interface ExchangeDetails {
  id: string;
  owner: string;
  post: string;
  type?: string;
  hash?: string;
  value: string;
  status: "success" | "warning" | "error" | "secondary";
  messages: string[];
  orders: {
    id: string;
    description: string;
    match?: string;
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
    // skip tx store for the lib
    return res.filter((val) => val.token !== "TX_STORE");
  } catch {
    throw new Error("Could not get orderbook");
  }
};

export const getExchangeDetails = async (
  client: Arweave,
  id: string,
  exchangeWallet: string
): Promise<ExchangeDetails> => {
  try {
    const transaction = await tx(id),
      owner = transaction.owner.address,
      post = transaction.recipient,
      type = transaction.tags.find(({ name }) => name === "Type")?.value,
      hash = transaction.tags.find(({ name }) => name === "Hash")?.value,
      orders: { id: string; description: string; match?: string }[] = [],
      messages: string[] = [];
    let value = "",
      status: "success" | "warning" | "error" | "secondary" = "success";

    if (type === "Buy") value = `${parseFloat(transaction.quantity.ar)} AR`;
    else if (type === "Sell") {
      const contract = transaction.tags.find((tag) => tag.name === "Contract");

      if (contract) {
        const state = await getContract(client, contract.value, true);
        value = await getPSTAmount(transaction, client);

        if (!isStateInterfaceWithValidity(state)) {
          status = "error";
          messages.push("Wrong data format for contract");
        } else if (state.validity[transaction.id]) {
          status = "warning";
          messages.push(
            "This order was created before tags for AR transfers were added."
          );
        } else {
          status = "error";
          messages.push("Invalid SmartWeave interaction.");
        }
      }
    } else if (type === "Swap") {
      const chain = transaction.tags.find((tag) => tag.name === "Chain")?.value,
        val = transaction.tags.find((tag) => tag.name === "Value")?.value;

      if (chain) {
        if (val) value = `${val} ${chain}`;
        else value = `${parseFloat(transaction.quantity.ar)} AR`;
      }
    }

    orders.push({
      id,
      description: `${type} - ${value}`,
    });

    // for purchases
    if (type === "Buy") {
      const res = await run(
        `
          query($post: String!, $order: [String!]!) {
            transactions(
              owners: [$post]
              tags: [
                { name: "Exchange", values: "Verto" }
                { name: "Type", values: "PST-Transfer" }
                { name: "Order", values: $order }
              ]
            ) {
              edges {
                node {
                  id
                  tags {
                    name
                    value
                  }
                }
              }
            }
        }
        `,
        { post, order: id }
      );

      for (const tx of res.data.transactions.edges) {
        const amnt = await getPSTAmount(tx.node, client),
          match = tx.node.tags.find((tag) => tag.name === "Match");

        orders.push({
          id: tx.node.id,
          description: `PST Transfer - ${amnt}`,
          match: match?.value,
        });
      }
    }

    // for sells
    if (type === "Sell") {
      const res = await run(
        `
          query($post: String!, $order: [String!]!) {
            transactions(
              owners: [$post]
              tags: [
                { name: "Exchange", values: "Verto" }
                { name: "Type", values: "AR-Transfer" }
                { name: "Order", values: $order }
              ]
            ) {
              edges {
                node {
                  id
                  quantity {
                    ar
                  }
                  tags {
                    name
                    value
                  }
                }
              }
            }
          }
        `,
        { post, order: id }
      );

      // AR transfer
      for (const tx of res.data.transactions.edges) {
        const amnt = await getPSTAmount(tx.node, client),
          match = tx.node.tags.find((tag) => tag.name === "Match");

        orders.push({
          id: tx.node.id,
          description: `AR Transfer - ${amnt}`,
          match: match?.value,
        });
      }
    }

    // for swaps
    if (type === "Swap") {
      if (hash) {
        const res = await run(
          `
            query($post: String!, $order: [String!]!) {
              transactions(
                owners: [$post]
                tags: [
                  { name: "Exchange", values: "Verto" }
                  { name: "Type", values: "AR-Transfer" }
                  { name: "Order", values: $order }
                ]
              ) {
                edges {
                  node {
                    id
                    quantity {
                      ar
                    }
                  }
                }
              }
            }
          `,
          { post, order: hash }
        );

        // AR transfer
        for (const tx of res.data.transactions.edges)
          orders.push({
            id: tx.node.id,
            description: `AR Transfer - ${parseFloat(tx.node.quantity.ar)} AR`,
          });

        // ETH
        if (res.data.transactions.edges.length === 0) {
          const config = await getConfig(client, post, exchangeWallet),
            // @ts-ignore
            url = config.publicURL.startsWith("https://")
              ? // @ts-ignore
                config.publicURL
              : // @ts-ignore
                "https://" + config.publicURL,
            endpoint = url.endsWith("/") ? "orders" : "/orders",
            tradingPostRes = await fetch(url + endpoint),
            orders = await tradingPostRes.clone().json(),
            table = orders.find((table: any) => table.token === "TX_STORE")
              .orders,
            entry = table.find((elem: any) => elem.txHash === hash);

          if (entry) {
            if (entry.parsed === 1) {
              status = "error";
              messages.push(
                "An error occured. Most likely the Ethereum hash submitted is invalid."
              );
            } else {
              //
            }
          } else {
            //
          }
        }
      } else {
        // AR -> ETH
      }
    }

    // is the exchange cancelled
    const calcelRes = await run(
      `
        query($post: String!, $order: [String!]!) {
          transactions(
            recipients: [$post]
            tags: [
              { name: "Exchange", values: "Verto" }
              { name: "Type", values: "Cancel" }
              { name: "Order", values: $order }
            ]
            first: 1
          ) {
            edges {
              node {
                id
              }
            }
          }
        }
      `,
      { post, order: id }
    );

    if (calcelRes.data.transactions.edges[0]) {
      status = "secondary";
      orders.push({
        id: calcelRes.data.transactions.edges[0].node.id,
        description: "Cancel",
      });
    }

    // is the transaction refunded
    const refundRes = await run(
      `
        query($post: String!, $order: [String!]!) {
          transactions(
            owners: [$post]
            tags: [
              { name: "Exchange", values: "Verto" }
              { name: "Type", values: "Refund" }
              { name: "Order", values: $order }
            ]
            first: 1
          ) {
            edges {
              node {
                id
                quantity {
                  ar
                }
                tags {
                  name
                  value
                }
              }
            }
          }
        }
      `,
      { post, order: id }
    );

    if (refundRes.data.transactions.edges[0]) {
      const tx = refundRes.data.transactions.edges[0].node;
      let amnt = "";
      if (type === "Buy") amnt = `${parseFloat(tx.quantity.ar)} AR`;
      if (type === "Sell") amnt = await getPSTAmount(tx, client);

      status = "secondary";
      orders.push({
        id: tx.id,
        description: `Refund - ${amnt}`,
      });
    }

    // is the transaction returned
    const returnRes = await run(
      `
        query($post: String!, $order: [String!]!) {
          transactions(
            owners: [$post]
            tags: [
              { name: "Exchange", values: "Verto" }
              { name: "Type", values: "${type}-Return" }
              { name: "Order", values: $order }
            ]
            first: 1
          ) {
            edges {
              node {
                id
                quantity {
                  ar
                }
                tags {
                  name
                  value
                }
              }
            }
          }
        }
      `,
      { post, order: id }
    );

    if (returnRes.data.transactions.edges[0]) {
      const tx = returnRes.data.transactions.edges[0].node;
      let amnt = "";
      if (type === "Buy") amnt = `${parseFloat(tx.quantity.ar)} AR`;
      if (type === "Sell") amnt = await getPSTAmount(tx, client);

      status = "secondary";
      orders.push({
        id: tx.id,
        description: `Return - ${amnt}`,
      });
    }

    // order confirmation
    if (type === "Buy" || type === "Sell") {
      const confirmRes = await run(
        `
          query($post: String!, $order: [String!]!) {
            transactions(
              owners: [$post]
              tags: [
                { name: "Exchange", values: "Verto" }
                { name: "Type", values: "Confirmation" }
                { name: "Match", values: $order }
              ]
              first: 1
            ) {
              edges {
                node {
                  id
                  tags {
                    name
                    value
                  }
                }
              }
            }
          }
        `,
        { post, order: id }
      );

      if (confirmRes.data.transactions.edges[0]) {
        const received = confirmRes.data.transactions.edges[0].node.tags.find(
          (tag) => tag.name === "Received"
        )?.value;
        status = "success";

        orders.push({
          id: confirmRes.data.transactions.edges[0].node.id,
          description: `Confirmation - ${received}`,
        });
      }
    }

    if (type === "Swap") {
      // TODO(@johnletey): Query for a swap confirmation
    }

    return {
      id,
      owner,
      post,
      type,
      hash,
      value,
      status,
      messages,
      orders,
    };
  } catch (e) {
    throw new Error(e);
  }
};

const getPSTAmount = async (tx: GQLNodeInterface, client: Arweave) => {
  const contract = tx.tags.find((tag) => tag.name === "Contract"),
    input = tx.tags.find((tag) => tag.name === "Input");

  if (contract && input) {
    const qty = JSON.parse(input.value).qty,
      res = await client.transactions.getData(contract.value, {
        decode: true,
        string: true,
      }),
      ticker = JSON.parse(res.toString()).ticker;

    return `${qty} ${ticker}`;
  }
  return "";
};
