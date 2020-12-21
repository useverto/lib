import Arweave from "arweave";
import {
  arVolume,
  chainRate,
  createOrder,
  createSwap,
  getAssets,
  getConfig,
  getExchanges,
  getPostStake,
  getReputation,
  getTokens,
  getTPTokens,
  getTradingPosts,
  getTransactions,
  latestChainRate,
  latestPrice,
  latestVolume,
  popularTokens,
  price,
  recommendPost,
  saveToken,
  sendOrder,
  sendSwap,
  volume,
} from "@lib/index";
import { exchangeContractSrc, exchangeWallet } from "@utils/constants";
import { VertoToken } from "types";
import { createGenericClient } from "@utils/arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import Transaction from "arweave/node/lib/transaction";
import Web3 from "web3";

// eslint-disable-next-line
console.log = (...x: any[]) => {
  if (new Error().stack?.includes("smartweave")) return;
  console.info(...x);
};

interface VertoLibOptions {
  exchangeContract?: string;
  exchangeWallet?: string;
}

export default class Verto {
  public arweave!: Arweave;
  public eth!: Web3 | undefined;
  public keyfile!: JWKInterface | undefined;
  public privateKey!: string | undefined;

  public exchangeContract!: string;
  public exchangeWallet!: string;

  constructor(
    keyfile?: JWKInterface,
    arweave?: Arweave,
    privateKey?: string,
    eth?: Web3,
    options?: VertoLibOptions
  ) {
    !arweave
      ? (this.arweave = createGenericClient())
      : (this.arweave = arweave);
    this.eth = eth;
    this.keyfile = keyfile;
    this.privateKey = privateKey;
    this.exchangeContract = options?.exchangeContract || exchangeContractSrc;
    this.exchangeWallet = options?.exchangeWallet || exchangeWallet;
  }

  arVolume(): Promise<{ volume: number[]; dates: string[] }> {
    return arVolume(this.arweave, this.exchangeContract, this.exchangeWallet);
  }

  chainRate(chain: string): Promise<{ rates: number[]; dates: string[] }> {
    return chainRate(
      this.arweave,
      chain,
      this.exchangeContract,
      this.exchangeWallet
    );
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
        this.exchangeContract,
        this.exchangeWallet,
        rate
      );
    } else {
      return new Promise((resolve) => resolve("keyfile"));
    }
  }

  createSwap(
    chain: string,
    post: string,
    arAmnt?: number,
    chainAmnt?: number,
    rate?: number,
    token?: string
  ): Promise<
    | {
        txs: (
          | Transaction
          | {
              chain: string;
              type?: string;
              token?: string;
              to: string;
              value: number;
            }
        )[];
        ar: number;
        chain: number;
      }
    | string
  > {
    if (this.keyfile) {
      return createSwap(
        this.arweave,
        this.eth,
        this.keyfile,
        this.privateKey,
        chain,
        post,
        this.exchangeWallet,
        this.exchangeContract,
        arAmnt,
        chainAmnt,
        rate,
        token
      );
    } else {
      return new Promise((resolve) => resolve("keyfile"));
    }
  }

  getAssets(
    addr: string
  ): Promise<{ id: string; name: string; ticker: string; balance: number }[]> {
    return getAssets(
      this.arweave,
      addr,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  getConfig(post: string): Promise<JSON | string> {
    return getConfig(this.arweave, post, this.exchangeWallet);
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
    return getExchanges(
      this.arweave,
      addr,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  getPostStake(post: string): Promise<number> {
    return getPostStake(this.arweave, post, this.exchangeContract);
  }

  getReputation(post: string): Promise<number> {
    return getReputation(this.arweave, post, this.exchangeContract);
  }

  getTokens(): Promise<VertoToken[]> {
    return getTokens(this.arweave, this.exchangeContract, this.exchangeWallet);
  }

  getTPTokens(post: string): Promise<VertoToken[]> {
    return getTPTokens(
      this.arweave,
      post,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  getTradingPosts(): Promise<string[]> {
    return getTradingPosts(
      this.arweave,
      this.exchangeContract,
      this.exchangeWallet
    );
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

  latestChainRate(chain: string): Promise<number> {
    return latestChainRate(
      this.arweave,
      chain,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  latestPrice(token: string): Promise<number | undefined> {
    return latestPrice(
      this.arweave,
      token,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  latestVolume(token: string): Promise<number> {
    return latestVolume(
      this.arweave,
      token,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  popularTokens(): Promise<VertoToken[]> {
    return popularTokens(this.arweave, this.exchangeWallet);
  }

  price(
    token: string
  ): Promise<{ prices: number[]; dates: string[] } | undefined> {
    return price(
      this.arweave,
      token,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  recommendPost(): Promise<string | undefined> {
    return recommendPost(
      this.arweave,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  saveToken(contract: string): Promise<string | void> {
    if (this.keyfile) {
      return saveToken(
        this.arweave,
        contract,
        this.keyfile,
        this.exchangeContract,
        this.exchangeWallet
      );
    }
    return new Promise((resolve) => resolve());
  }

  sendOrder(txs: Transaction[]): Promise<void | string> {
    if (this.keyfile) {
      return sendOrder(this.arweave, this.keyfile, txs);
    } else {
      return new Promise((resolve) => resolve("keyfile"));
    }
  }

  sendSwap(
    txs: (
      | Transaction
      | {
          chain: string;
          to: string;
          value: number;
        }
    )[],
    post: string
  ): Promise<void | string> {
    if (this.keyfile) {
      return sendSwap(
        this.arweave,
        this.eth,
        this.keyfile,
        this.privateKey,
        txs,
        post
      );
    } else {
      return new Promise((resolve) => resolve("keyfile"));
    }
  }

  volume(token: string): Promise<{ volume: number[]; dates: string[] }> {
    return volume(
      this.arweave,
      token,
      this.exchangeContract,
      this.exchangeWallet
    );
  }
}
