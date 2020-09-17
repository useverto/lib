import { getTokens, getTradingPosts } from "@lib/index";
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
