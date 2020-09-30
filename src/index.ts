import Arweave from "arweave";
import {
  createOrder,
  getAssets,
  getConfig,
  getExchanges,
  getPostStake,
  getReputation,
  getTokens,
  getTPTokens,
  getTradingPosts,
  getTransactions,
  latestPrice,
  latestVolume,
  price,
  recommendPost,
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
  ): Promise<{ id: string; name: string; ticker: string; balance: number }[]> {
    return getAssets(this.arweave, addr);
  }

  getConfig(post: string): Promise<JSON | string> {
    return getConfig(this.arweave, post);
  }

  getExchanges(
    addr: string
  ): Promise<
    {
      id: string;
      timestamp: string;
      type: string;
      sent: string;
      received: string;
      status: string;
      duration: string;
    }[]
  > {
    return getExchanges(this.arweave, addr);
  }

  getPostStake(post: string): Promise<number> {
    return getPostStake(this.arweave, post);
  }

  getReputation(post: string): Promise<number> {
    return getReputation(this.arweave, post);
  }

  getTokens(src?: string): Promise<VertoToken[]> {
    return getTokens(this.arweave, src);
  }

  getTPTokens(post: string): Promise<VertoToken[]> {
    return getTPTokens(this.arweave, post);
  }

  getTradingPosts(): Promise<string[]> {
    return getTradingPosts();
  }

  getTransactions(
    addr: string
  ): Promise<
    {
      id: string;
      amount: number;
      type: string;
      status: string;
      timestamp: number;
    }[]
  > {
    return getTransactions(this.arweave, addr);
  }

  latestPrice(token: string): Promise<number | undefined> {
    return latestPrice(token);
  }

  latestVolume(token: string): Promise<number> {
    return latestVolume(token);
  }

  price(
    token: string
  ): Promise<{ prices: number[]; dates: string[] } | undefined> {
    return price(token);
  }

  recommendPost(): Promise<string | undefined> {
    return recommendPost(this.arweave);
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
