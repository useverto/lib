import Arweave from "arweave";
import {
  getTokens,
  getTradingPosts,
  latestVolume,
  price,
  volume,
} from "@lib/index";
import { VertoToken } from "types";
import { createGenericClient } from "@utils/arweave";

export default class Verto {
  public arweave!: Arweave;

  constructor(arweave?: Arweave) {
    if (!arweave) {
      this.arweave = createGenericClient();
    } else {
      this.arweave = arweave;
    }
  }

  getTokens(src?: string): Promise<VertoToken[]> {
    return getTokens(this.arweave, src);
  }

  getTradingPosts(): Promise<string[]> {
    return getTradingPosts();
  }

  latestVolume(token: string): Promise<number> {
    return latestVolume(token);
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
