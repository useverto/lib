import Arweave from "arweave";
import {
  arVolume,
  chainRate,
  createOrder,
  createSwap,
  getAssets,
  getConfig,
  Exchange,
  parseExchange,
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
  paginateExchanges,
  getOrderBook,
  OrderBookItem,
  ExchangeDetails,
  getExchangeDetails,
} from "@lib/index";
import { exchangeContractSrc, exchangeWallet } from "@utils/constants";
import { VertoToken } from "types";
import { createGenericClient } from "@utils/arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import Transaction from "arweave/node/lib/transaction";
import { GQLEdgeInterface } from "ar-gql/dist/faces";

// eslint-disable-next-line
console.log = (...x: any[]) => {
  if (new Error().stack?.includes("smartweave")) return;
  console.info(...x);
};

interface VertoLibOptions {
  useCache?: boolean;
  exchangeContract?: string;
  exchangeWallet?: string;
}

export default class Verto {
  public arweave!: Arweave;
  public keyfile!: JWKInterface | undefined;

  public useCache!: boolean;
  public exchangeContract!: string;
  public exchangeWallet!: string;

  constructor(
    keyfile?: JWKInterface,
    arweave?: Arweave,
    options?: VertoLibOptions
  ) {
    !arweave
      ? (this.arweave = createGenericClient())
      : (this.arweave = arweave);
    this.keyfile = keyfile;
    this.useCache = options?.useCache || false;
    this.exchangeContract = options?.exchangeContract || exchangeContractSrc;
    this.exchangeWallet = options?.exchangeWallet || exchangeWallet;
  }

  arVolume(): Promise<{ volume: number[]; dates: string[] }> {
    return arVolume();
  }

  chainRate(chain: string): Promise<{ rates: number[]; dates: string[] }> {
    return chainRate(
      this.arweave,
      chain,
      this.useCache,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  /**
   * Creates trade order transactions
   * @param type "buy" or "sell"
   * @param amnt The amount of currency you are inputting. Note: If you are selling, the amount must be an integer
   * @param pst The PST contract you are looking to buy, or the PST you are selling
   * @param post The wallet address of the trading post you are using
   * @param rate The rate (in units of AR/PST) that you wish to sell at. Note: This field is only necessary if you are selling
   */
  createOrder(
    type: string,
    amnt: number,
    pst: string,
    post: string,
    rate?: number,
    tags?: { [key: string]: string }
  ): Promise<{ txs: Transaction[]; ar: number; pst: number } | string> {
    return createOrder(
      this.arweave,
      this.keyfile,
      type,
      amnt,
      pst,
      post,
      this.useCache,
      this.exchangeContract,
      this.exchangeWallet,
      rate,
      tags
    );
  }

  /**
   * Creates swap order transactions (utilizes the Ethereum Bridge)
   * @param chain "ETH"
   * @param post The wallet address of the trading post you are using
   * @param arAmnt The amount of AR you are sending (Only required if you're sending AR)
   * @param chainAmnt The amount of ETH you are sending (Only required if you're sending ETH)
   * @param rate The rate (in units of AR/ETH) that you wish to swap at. Note: This field is only necessary if you are sending AR
   * @param token The PST contract id you wish to receive for sending ETH
   */
  createSwap(
    chain: string,
    post: string,
    arAmnt?: number,
    chainAmnt?: number,
    rate?: number,
    token?: string,
    tags?: { [key: string]: string }
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
    return createSwap(
      this.arweave,
      this.keyfile,
      chain,
      post,
      this.useCache,
      this.exchangeWallet,
      this.exchangeContract,
      arAmnt,
      chainAmnt,
      rate,
      token,
      tags
    );
  }

  /**
   * Finds the PST assets of a given wallet address
   * @param addr User wallet address
   * @returns List of PST ids, names, balances, & tickers
   */
  getAssets(
    addr: string
  ): Promise<{ id: string; name: string; ticker: string; balance: number }[]> {
    return getAssets(
      this.arweave,
      addr,
      this.useCache,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  /**
   * Trading post configuration
   * @param post Trading post address
   * @returns Trading post configuration from latest genesis transaction
   */
  getConfig(post: string): Promise<JSON | string> {
    return getConfig(this.arweave, post, this.exchangeWallet);
  }

  parseExchange(edge: GQLEdgeInterface): Promise<Exchange | undefined> {
    return parseExchange(
      this.arweave,
      edge,
      this.useCache,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  /**
   * Get details about an exchange
   * @param id Exchange ID
   * @returns Exchange details
   */
  getExchangeDetails(id: string): Promise<ExchangeDetails> {
    return getExchangeDetails(
      this.arweave,
      id,
      this.useCache,
      this.exchangeWallet
    );
  }

  /**
   * Finds the latest trades made on Verto
   * @param addr Wallet address of user
   * @returns List of five latest exchanges
   */
  getExchanges(addr: string): Promise<Exchange[]> {
    return getExchanges(
      this.arweave,
      addr,
      this.useCache,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  /**
   * Paginate all trades of the user
   * @param addr Wallet address of user
   * @param cursor Optional cursor to paginate
   * @return List of exchanges for the cursor
   */
  paginateExchanges(
    addr: string,
    cursor?: string
  ): Promise<{ exchanges: Exchange[]; cursor?: string }> {
    return paginateExchanges(
      this.arweave,
      addr,
      this.useCache,
      this.exchangeContract,
      this.exchangeWallet,
      cursor
    );
  }

  /**
   * Get order book for post
   * @param post
   * @return Order book for post
   */
  getOrderBook(post: string): Promise<OrderBookItem[]> {
    return getOrderBook(this.arweave, post, this.exchangeWallet);
  }

  /**
   * Find a trading post's stake
   * @param post Address of trading post
   * @returns Trading post stake
   */
  getPostStake(post: string): Promise<number> {
    return getPostStake(
      this.arweave,
      post,
      this.useCache,
      this.exchangeContract
    );
  }

  /**
   * Find the reputation of a trading post
   * @param post Address of trading post
   * @returns Trading post reputation
   */
  getReputation(post: string): Promise<number> {
    return getReputation(
      this.arweave,
      post,
      this.useCache,
      this.exchangeContract
    );
  }

  /**
   * Find the tokens added and/or traded on Verto
   * @returns List of token ids, names, and tickers
   */
  getTokens(): Promise<VertoToken[]> {
    return getTokens(this.arweave, this.useCache, this.exchangeContract);
  }

  /**
   * Find the tokens supported by a trading post
   * @param post Address of trading post
   * @returns List of token ids, names, and tickers
   */
  getTPTokens(post: string): Promise<VertoToken[]> {
    return getTPTokens(
      this.arweave,
      post,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  /**
   * Find all trading posts on the Verto Protocol
   * @returns List of trading post wallet addresses
   */
  getTradingPosts(): Promise<string[]> {
    return getTradingPosts(
      this.arweave,
      this.useCache,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  /**
   * Find the latest transactions for a given user
   * @param addr Address of user
   * @returns List of five latest transactions
   */
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

  /**
   * Find the latest rate at which a given chain has been swapping for
   * @param chain "ETH"
   * @returns Latest rate
   */
  latestChainRate(chain: string): Promise<number> {
    return latestChainRate(
      this.arweave,
      chain,
      this.useCache,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  /**
   * Find the latest price a given token has been trading at
   * @param token PST contract id
   * @returns Latest price
   */
  latestPrice(token: string): Promise<number | undefined> {
    return latestPrice(token);
  }

  /**
   * Finds the latest 24hr volume of a given token
   * @param token PST contract id
   * @returns Latest 24hr volume
   */
  latestVolume(token: string): Promise<number> {
    return latestVolume(token);
  }

  /**
   * Popular tokens -- Deprecating soon!
   */
  popularTokens(): Promise<VertoToken[]> {
    return popularTokens(this.arweave, this.exchangeWallet);
  }

  /**
   * Find the price history of a given token
   * @param token PST contract id
   * @returns List of prices and dates
   */
  price(
    token: string
  ): Promise<{ prices: number[]; dates: string[] } | undefined> {
    return price(token);
  }

  /**
   * Recommend a trading post to make a trade or swap with
   */
  recommendPost(): Promise<string | undefined> {
    return recommendPost(
      this.arweave,
      this.useCache,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  /**
   * Save a token to the Verto Protocol - This means it will be visible on the exchange and user dashboards
   * @param contract PST contract id
   */
  saveToken(contract: string): Promise<string | void> {
    return saveToken(
      this.arweave,
      contract,
      this.keyfile,
      this.useCache,
      this.exchangeContract,
      this.exchangeWallet
    );
  }

  /**
   * Sign and post trade transactions
   * @param txs Transactions created with createOrder()
   */
  sendOrder(txs: Transaction[]): Promise<void> {
    return sendOrder(this.arweave, this.keyfile, txs);
  }

  /**
   * Sign and post swap transactions
   * @param txs Transactions created with createSwap()
   * @param post Address of trading post
   */
  sendSwap(
    txs: (
      | Transaction
      | {
          chain: string;
          to: string;
          value: number;
        }
    )[],
    post: string,
    tags?: { [key: string]: string }
  ): Promise<void> {
    return sendSwap(this.arweave, this.keyfile, txs, post, tags);
  }

  /**
   * Find the volume history of a given token
   * @param token PST contract id
   * @returns List of volumes and dates
   */
  volume(token: string): Promise<{ volume: number[]; dates: string[] }> {
    return volume(token);
  }
}
