import Arweave from "arweave";
import { getTradingPosts } from "./get_trading_posts";
import { all } from "ar-gql";
import sellQuery from "../queries/sell.gql";
import buyQuery from "../queries/buy.gql";
import moment from "moment";

export const volume = async (
  client: Arweave,
  token: string,
  exchangeContract: string,
  exchangeWallet: string
): Promise<{ volume: number[]; dates: string[] }> => {
  const posts = await getTradingPosts(client, exchangeContract, exchangeWallet);

  const orderTxs = await all(sellQuery, {
    recipients: posts,
    token,
  });

  const orders: { amnt: number; timestamp: number }[] = [];
  orderTxs.map(({ node }) => {
    const inputTag = node.tags.find((tag) => tag.name === "Input");

    if (inputTag) {
      orders.push({
        amnt: JSON.parse(inputTag.value).qty,
        timestamp: node.block.timestamp,
      });
    }
  });

  const volume: number[] = [];
  const days: string[] = [];

  if (orders.length > 0) {
    let high = moment().add(1, "days").hours(0).minutes(0).seconds(0);

    while (high.unix() >= orders[orders.length - 1].timestamp) {
      const low = high.clone().subtract(1, "days");

      const sum = orders
        .filter(
          (order) =>
            order.timestamp <= high.unix() && order.timestamp >= low.unix()
        )
        .map((order) => order.amnt)
        .reduce((a, b) => a + b, 0);

      volume.push(sum);
      days.push(low.format("MMM DD"));

      high = low;
    }
  }

  return { volume: volume.reverse(), dates: days.reverse() };
};

export const arVolume = async (
  client: Arweave,
  exchangeContract: string,
  exchangeWallet: string
): Promise<{ volume: number[]; dates: string[] }> => {
  const posts = await getTradingPosts(client, exchangeContract, exchangeWallet);

  const orderTxs = await all(buyQuery, {
    recipients: posts,
  });

  const orders: { amnt: number; timestamp: number }[] = [];
  orderTxs.map(({ node }) => {
    orders.push({
      amnt: parseFloat(node.quantity.ar),
      timestamp: node.block.timestamp,
    });
  });

  const volume: number[] = [];
  const days: string[] = [];

  if (orders.length > 0) {
    let high = moment().add(1, "days").hours(0).minutes(0).seconds(0);

    while (high.unix() >= orders[orders.length - 1].timestamp) {
      const low = high.clone().subtract(1, "days");

      const sum = orders
        .filter(
          (order) =>
            order.timestamp <= high.unix() && order.timestamp >= low.unix()
        )
        .map((order) => order.amnt)
        .reduce((a, b) => a + b, 0);

      volume.push(sum);
      days.push(low.format("MMM DD"));

      high = low;
    }
  }

  return { volume: volume.reverse(), dates: days.reverse() };
};
