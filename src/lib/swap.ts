import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import tokensQuery from "../queries/tokens.gql";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import Transaction from "arweave/node/lib/transaction";
import { getTradingPostFee, getTxFee } from "./fees";

const getAddr = async (addr: string, chain: string): Promise<string> => {
  const txs = (
    await query<EdgeQueryResponse>({
      query: tokensQuery,
      variables: {
        addr,
        chain,
      },
    })
  ).data.transactions.edges;

  if (txs.length === 1) {
    return txs[0].node.id;
  }

  return "invalid";
};

export const createTradingPostFeeTx = async (
  client: Arweave,
  keyfile: JWKInterface,
  amnt: number,
  post: string,
  exchangeWallet: string
): Promise<{ tx: Transaction; fee: number }> => {
  const fee = amnt * (await getTradingPostFee(client, post, exchangeWallet));

  const tags = {
    Exchange: "Verto",
    Type: "Fee-Trading-Post",
  };

  const tx = await client.createTransaction(
    {
      target: post,
      quantity: client.ar.arToWinston(fee.toString()),
    },
    keyfile
  );

  for (const [key, value] of Object.entries(tags)) {
    tx.addTag(key, value);
  }

  return { tx, fee };
};

export const createSwap = async (
  client: Arweave,
  keyfile: JWKInterface,
  chain: string,
  post: string,
  exchangeWallet: string,
  arAmnt?: number,
  ethAmnt?: number,
  rate?: number
): Promise<{ txs: Transaction[]; ar: number; chain: number } | string> => {
  const addr = await client.wallets.jwkToAddress(keyfile);
  const arBalance = parseFloat(
    client.ar.winstonToAr(await client.wallets.getBalance(addr))
  );

  if (arAmnt) {
    const transfer = await getAddr(addr, chain);
    if (transfer === "invalid") return "arLink";

    if (!rate) return "invalid";
    const tags = {
      Exchange: "Verto",
      Type: "Buy",
      Rate: rate,
      Transfer: transfer,
    };

    const tx = await client.createTransaction(
      {
        target: post,
        quantity: client.ar.arToWinston(arAmnt.toString()),
      },
      keyfile
    );

    for (const [key, value] of Object.entries(tags)) {
      tx.addTag(key, value.toString());
    }

    const {
      tx: tradingPostFeeTx,
      fee: tradingPostFee,
    } = await createTradingPostFeeTx(
      client,
      keyfile,
      arAmnt,
      post,
      exchangeWallet
    );
    const txFees =
      (await getTxFee(client, tx)) + (await getTxFee(client, tradingPostFeeTx));

    if (arBalance >= txFees + arAmnt + tradingPostFee) {
      return {
        txs: [tx, tradingPostFeeTx],
        ar: txFees + arAmnt + tradingPostFee,
        chain: 0,
      };
    } else {
      return "ar";
    }
  } else if (ethAmnt) {
    // @ts-ignore
    const isBrowser: boolean = typeof window !== "undefined";

    if (isBrowser) {
      // @ts-ignore
      if (typeof window.ethereum !== "undefined") {
        return "todo";
      } else {
        return "metamask";
      }
    } else {
      return "browser";
    }
  } else {
    return "invalid";
  }
};
