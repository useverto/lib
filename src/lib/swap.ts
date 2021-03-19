import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import Transaction from "arweave/node/lib/transaction";
import { getTradingPostFee, getTxFee } from "./fees";
import { exchangeFee } from "@utils/constants";
import { getContract } from "cacheweave";
import { weightedRandom } from "@utils/weighted_random";
import { getConfig } from "./get_config";
import { getArAddr, getChainAddr } from "@utils/arweave";
import axios from "axios";
import { ethers } from "ethers";

export const createTradingPostFeeTx = async (
  client: Arweave,
  keyfile: JWKInterface | "use_wallet" | undefined,
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

export interface Transfer {
  chain: string;
  type?: string;
  token?: string;
  to: string;
  value: number;
}

export const createSwap = async (
  client: Arweave,
  keyfile: JWKInterface | "use_wallet" | undefined,
  chain: string,
  post: string,
  useCache: boolean,
  exchangeWallet: string,
  exchangeContract: string,
  arAmnt?: number,
  chainAmnt?: number,
  rate?: number,
  token?: string,
  tags?: { [key: string]: string }
): Promise<
  | {
      txs: (Transaction | Transfer)[];
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
    if (!(await getChainAddr(addr, chain))) return "arLink";

    if (!rate) return "invalid";
    const obj = {
      Exchange: "Verto",
      Type: "Swap",
      Chain: chain,
      Rate: rate,
      ...tags,
    };

    const tx = await client.createTransaction(
      {
        target: post,
        quantity: client.ar.arToWinston(arAmnt.toString()),
      },
      keyfile
    );

    for (const [key, value] of Object.entries(obj)) {
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
        txs: [tradingPostFeeTx, tx],
        ar: txFees + arAmnt + tradingPostFee,
        chain: 0,
      };
    } else {
      return "ar";
    }
  } else if (chainAmnt) {
    // @ts-ignore
    if (!(await getArAddr(window.ethereum.selectedAddress, chain)))
      return "arLink";

    const supportedChains =
      // @ts-ignore
      (await getConfig(client, post, exchangeWallet)).chain;

    const fee = chainAmnt * exchangeFee;
    const chainTotal = chainAmnt + fee;

    // @ts-ignore
    let balance = await window.ethereum.request({
      method: "eth_getBalance",
      // @ts-ignore
      params: [window.ethereum.selectedAddress, "latest"],
    });
    balance = parseInt(balance, 16) / 1e18;

    if (balance >= chainTotal) {
      return {
        txs: [
          {
            chain,
            type: "FEE",
            to: await selectWeightedHolder(
              client,
              exchangeContract,
              chain,
              useCache,
              exchangeWallet
            ),
            value: fee,
          },
          { chain, token, to: supportedChains[chain].addr, value: chainAmnt },
        ],
        ar: 0,
        chain: chainTotal,
      };
    } else {
      return "chain";
    }
  } else {
    return "invalid";
  }
};

export const sendSwap = async (
  client: Arweave,
  keyfile: JWKInterface | "use_wallet" | undefined,
  txs: (Transaction | Transfer)[],
  post: string,
  tags?: { [key: string]: string }
): Promise<void> => {
  for (const tx of txs) {
    // @ts-ignore
    if (tx.tags) {
      // @ts-ignore
      await client.transactions.sign(tx, keyfile);
      await client.transactions.post(tx);

      // @ts-ignore
      for (const tag of tx.tags) {
        const key = tag.get("name", { decode: true, string: true });
        const value = tag.get("value", { decode: true, string: true });

        if (
          key === "Type" &&
          (value === "Swap" || value === "Buy" || value === "Sell")
        ) {
          // @ts-ignore
          axios.post(`https://hook.verto.exchange/api/transaction?id=${tx.id}`);
        }
      }
    } else {
      if (tx.chain === "ETH") {
        // @ts-ignore
        const isBrowser: boolean = typeof window !== "undefined";

        if (isBrowser) {
          // @ts-ignore
          if (typeof window.ethereum !== "undefined") {
            const amountBeforeDecimal = tx.value.toString().split(".")[0]
              .length;
            tx.value = parseFloat(
              ethers.utils
                .parseEther(
                  tx.value.toFixed(18 - amountBeforeDecimal).toString()
                )
                .toString()
            );
            // @ts-ignore
            await window.ethereum.request({
              method: "eth_requestAccounts",
            });
            // @ts-ignore
            const hash = await window.ethereum.request({
              method: "eth_sendTransaction",
              params: [
                {
                  to: tx.to,
                  // @ts-ignore
                  from: window.ethereum.selectedAddress,
                  // @ts-ignore
                  value: tx.value.toString(16),
                },
              ],
            });

            if (!tx.type) {
              const obj = {
                Exchange: "Verto",
                Type: "Swap",
                Chain: tx.chain,
                Hash: hash,
                Value: tx.value / 1e18,
                ...tags,
              };
              const arTx = await client.createTransaction(
                {
                  target: post,
                  data: Math.random().toString().slice(-4),
                },
                keyfile
              );
              for (const [key, value] of Object.entries(obj)) {
                arTx.addTag(key, value.toString());
              }
              if (tx.token) arTx.addTag("Token", tx.token);
              await client.transactions.sign(arTx, keyfile);
              await client.transactions.post(arTx);

              axios.post(
                `https://hook.verto.exchange/api/transaction?id=${arTx.id}`
              );
            }
          }
        }
      }
    }
  }
};

export const selectWeightedHolder = async (
  client: Arweave,
  contract: string,
  chain: string,
  useCache: boolean,
  exchangeWallet: string
): Promise<string> => {
  let state: any;
  if (useCache) {
    const { data } = await axios.get(
      `https://cache.verto.exchange/${contract}`
    );
    state = data.state;
  } else {
    state = await getContract(client, contract);
  }
  const balances = state.balances;
  const vault: {
    [key: string]: {
      balance: number;
      start: number;
      end: number;
    }[];
  } = state.vault;

  for (const addr of Object.keys(balances)) {
    const chainAddr = await getChainAddr(addr, chain);
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

  return (await getChainAddr(
    weightedRandom(weighted) || exchangeWallet,
    chain
  ))!;
};
