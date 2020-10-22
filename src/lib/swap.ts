import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import tokensQuery from "../queries/tokens.gql";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import Transaction from "arweave/node/lib/transaction";
import { getTradingPostFee, getTxFee } from "./fees";
import { exchangeFee } from "@utils/constants";
import { getContract } from "cacheweave";
import { weightedRandom } from "@utils/weighted_random";

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

interface Account {
  addr: string;
  amnt: number;
}

export const createSwap = async (
  client: Arweave,
  keyfile: JWKInterface,
  chain: string,
  post: string,
  exchangeWallet: string,
  exchangeContract: string,
  arAmnt?: number,
  ethAmnt?: number,
  rate?: number
): Promise<
  | {
      txs: (Transaction | Account[])[];
      ar: number;
      chain: number;
    }
  | string
> => {
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
      Type: "Swap",
      Chain: chain,
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
    const tags = {
      Exchange: "Verto",
      Type: "Swap",
      Chain: chain,
      Amount: ethAmnt,
    };

    const tx = await client.createTransaction(
      {
        target: post,
        data: Math.random().toString().slice(-4),
      },
      keyfile
    );

    for (const [key, value] of Object.entries(tags)) {
      tx.addTag(key, value.toString());
    }

    const txFee = await getTxFee(client, tx);
    const ethTotal = ethAmnt + ethAmnt * exchangeFee;

    if (arBalance >= txFee) {
      // TODO(@johnletey): Check the user's ETH balance
      return {
        txs: [
          tx,
          [
            { addr: post, amnt: ethAmnt },
            {
              addr: await selectWeightedHolder(
                client,
                exchangeContract,
                chain,
                exchangeWallet
              ),
              amnt: ethAmnt * exchangeFee,
            },
          ],
        ],
        ar: txFee,
        chain: ethTotal,
      };
    } else {
      return "ar";
    }
  } else {
    return "invalid";
  }
};

export const sendSwap = async (
  client: Arweave,
  keyfile: JWKInterface,
  txs: (Transaction | Record<string, string>)[]
): Promise<void> => {
  for (const tx of txs) {
    if (tx.id) {
      // @ts-ignore
      await client.transactions.sign(tx, keyfile);
      await client.transactions.post(tx);
    } else {
      // @ts-ignore
      const isBrowser: boolean = typeof window !== "undefined";

      if (isBrowser) {
        // @ts-ignore
        if (typeof window.ethereum !== "undefined") {
          // @ts-ignore
          await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [tx],
          });
        }
      }
    }
  }
};

export const selectWeightedHolder = async (
  client: Arweave,
  contract: string,
  chain: string,
  exchangeWallet: string
): Promise<string> => {
  const state = await getContract(client, contract);
  const balances = state.balances;
  const vault = state.vault;

  for (const addr of Object.keys(balances)) {
    const chainAddr = await getAddr(addr, chain);
    if (chainAddr === "invalid") {
      delete balances[addr];
      delete vault[addr];
    }
  }

  let totalTokens = 0;
  for (const addr of Object.keys(balances)) {
    totalTokens += balances[addr];
  }

  for (const addr of Object.keys(vault)) {
    if (!vault[addr].length) continue;

    const vaultBalance = vault[addr]
      .map((a) => a.balance)
      .reduce((a, b) => a + b, 0);
    totalTokens += vaultBalance;
    if (addr in balances) {
      balances[addr] += vaultBalance;
    } else {
      balances[addr] = vaultBalance;
    }
  }

  const weighted: { [addr: string]: number } = {};
  for (const addr of Object.keys(balances)) {
    weighted[addr] = balances[addr] / totalTokens;
  }

  return await getAddr(weightedRandom(weighted) || exchangeWallet, chain);
};
