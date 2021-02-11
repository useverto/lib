import { price } from "./price";

export const latestPrice = async (
  token: string
): Promise<number | undefined> => {
  const prices = await price(token);

  if (prices) {
    return prices.prices[prices.prices.length - 1];
  }

  return;
};
