import Arweave from "arweave";
import { price } from "./price";

export const latestPrice = async (
  client: Arweave,
  token: string,
  exchangeContract: string,
  exchangeWallet: string
): Promise<number | undefined> => {
  const prices = await price(client, token, exchangeContract, exchangeWallet);

  if (prices) {
    return prices.prices[prices.prices.length - 1];
  }

  return;
};
