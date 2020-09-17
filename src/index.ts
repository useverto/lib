import { getTokens, getTradingPosts } from "@lib/index";
import Arweave from "arweave";
import { VertoToken } from "types";

export default class Verto {
  public arweave!: Arweave;

  constructor(arweave: Arweave) {
    this.arweave = arweave;
  }

  getTokens(src: string): Promise<VertoToken[]> {
    return getTokens(src);
  }

  getTradingPosts(): Promise<string[]> {
    return getTradingPosts();
  }
}
