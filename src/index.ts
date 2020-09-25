import Arweave from "arweave";
import {
  createOrder,
  getAssets,
  getConfig,
  getTokens,
  getTradingPosts,
  price,
  sendOrder,
  volume,
} from "@lib/index";
import { VertoToken } from "types";
import { createGenericClient } from "@utils/arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import Transaction from "arweave/node/lib/transaction";

export default class Verto {
  public arweave!: Arweave;
  public keyfile!: JWKInterface | undefined;

  constructor(keyfile?: JWKInterface, arweave?: Arweave) {
    if (!arweave) {
      this.arweave = createGenericClient();
    } else {
      this.arweave = arweave;
    }

    if (keyfile) {
      this.keyfile = keyfile;
    }
  }

  createOrder(
    type: string,
    amnt: number,
    pst: string,
    post: string,
    rate?: number
  ): Promise<{ txs: Transaction[]; ar: number; pst: number } | string> {
    if (this.keyfile) {
      return createOrder(
        this.arweave,
        this.keyfile,
        type,
        amnt,
        pst,
        post,
        rate
      );
    } else {
      return new Promise((resolve) => resolve("keyfile"));
    }
  }

  getAssets(
    addr: string
  ): Promise<{ id: string; ticker: string; balance: number }[]> {
    return getAssets(this.arweave, addr);
  }

  getConfig(post: string): Promise<JSON | string> {
    return getConfig(this.arweave, post);
  }

  getTokens(src?: string): Promise<VertoToken[]> {
    return getTokens(this.arweave, src);
  }

  getTradingPosts(): Promise<string[]> {
    return getTradingPosts();
  }

  price(
    token: string
  ): Promise<{ prices: number[]; dates: string[] } | undefined> {
    return price(token);
  }

  sendOrder(txs: Transaction[]): Promise<void | string> {
    if (this.keyfile) {
      return sendOrder(this.arweave, this.keyfile, txs);
    } else {
      return new Promise((resolve) => resolve("keyfile"));
    }
  }

  volume(token: string): Promise<{ volume: number[]; dates: string[] }> {
    return volume(token);
  }
}
