import Arweave from "arweave";
import {
  createOrder,
  getAssets,
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
  ): Promise<{ txs: Transaction[]; ar: number; pst: number } | undefined> {
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
    }

    return new Promise(() => undefined);
  }

  getAssets(
    addr: string
  ): Promise<{ id: string; ticker: string; balance: number }[]> {
    return getAssets(this.arweave, addr);
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

  sendOrder(txs: Transaction[]): Promise<void> {
    if (this.keyfile) {
      return sendOrder(this.arweave, this.keyfile, txs);
    }

    return new Promise(() => {
      //
    });
  }

  volume(token: string): Promise<{ volume: number[]; dates: string[] }> {
    return volume(token);
  }
}
