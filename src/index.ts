import { getTokens } from "./lib/get_tokens";
import { getTradingPosts } from "./lib/get_trading_posts";
import Arweave from "arweave";

export default class Verto {
  public arweave!: Arweave;

  constructor(arweave: Arweave) {
    this.arweave = arweave;
  }

  getTokens(src: string) {
    return getTokens(src);
  }
}
