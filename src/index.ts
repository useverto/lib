import { getTokens, getTradingPosts, price, volume } from "@lib/index";
import Arweave from "arweave";
import { VertoToken } from "types";

export default class Verto {
  getTokens(src: string): Promise<VertoToken[]> {
    return getTokens(src);
  }

  getTradingPosts(): Promise<string[]> {
    return getTradingPosts();
  }

  price(
    token: string
  ): Promise<{ prices: number[]; dates: string[] } | undefined> {
    return price(token);
  }

  volume(token: string): Promise<{ volume: number[]; dates: string[] }> {
    return volume(token);
  }
}
