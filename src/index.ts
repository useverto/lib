import { getTokens } from "./get_tokens";
import { getTradingPosts } from "./get_trading_posts";
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
