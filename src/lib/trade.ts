import axios from "axios";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import Transaction from "arweave/node/lib/transaction";
import { getConfig } from "./get_config";
import { getContract } from "cacheweave";
import {
  createExchangeFeeTx,
  createTradingPostFeeTx,
  createVRTHolderFeeTx,
  getTradingPostFee,
  getTxFee,
} from "./fees";
import { exchangeFee } from "@utils/constants";

export const createOrder = async (
  client: Arweave,
  keyfile: JWKInterface | "use_wallet" | undefined,
  type: string,
  amnt: number,
  pst: string,
  post: string,
  useCache: boolean,
  exchangeContract: string,
  exchangeWallet: string,
  rate?: number,
  tags?: { [key: string]: string }
): Promise<{ txs: Transaction[]; ar: number; pst: number } | string> => {
  const config = await getConfig(client, post, exchangeWallet);
  // @ts-ignore
  if (pst in config.blockedTokens) {
    return "token";
  }

  const addr = await client.wallets.jwkToAddress(keyfile);
  const arBalance = parseFloat(
    client.ar.winstonToAr(await client.wallets.getBalance(addr))
  );
  let contractRes: any;
  if (useCache) {
    const { data } = await axios.get(`https://cache.verto.exchange/${pst}`);
    contractRes = data.state;
  } else {
    contractRes = await getContract(client, pst);
  }
  const pstBalance = contractRes.balances[addr];

  if (type.toLowerCase() === "buy") {
    const obj = {
      Exchange: "Verto",
      Type: "Buy",
      Token: pst,
      ...tags,
    };

    const tx = await client.createTransaction(
      {
        target: post,
        quantity: client.ar.arToWinston(amnt.toString()),
      },
      keyfile
    );

    for (const [key, value] of Object.entries(obj)) {
      tx.addTag(key, value);
    }

    const exchangeFeeTx = await createExchangeFeeTx(
      client,
      keyfile,
      amnt,
      exchangeWallet
    );
    const txFees =
      (await getTxFee(client, tx)) + (await getTxFee(client, exchangeFeeTx));

    const arAmnt = txFees + amnt + amnt * exchangeFee;
    if (arBalance >= arAmnt) {
      return {
        txs: [tx, exchangeFeeTx],
        ar: arAmnt,
        pst: 0,
      };
    } else {
      return "ar";
    }
  }

  if (type.toLowerCase() === "sell" && rate) {
    const obj = {
      Exchange: "Verto",
      Type: "Sell",
      "App-Name": "SmartWeaveAction",
      "App-Version": "0.3.0",
      Contract: pst,
      Rate: 1 / rate,
      Input: JSON.stringify({
        function: "transfer",
        target: post,
        qty: Math.ceil(amnt),
      }),
      ...tags,
    };

    const tx = await client.createTransaction(
      {
        target: post,
        data: Math.random().toString().slice(-4),
      },
      keyfile
    );

    for (const [key, value] of Object.entries(obj)) {
      tx.addTag(key, value.toString());
    }

    const tradingPostFeeTx = await createTradingPostFeeTx(
      client,
      keyfile,
      amnt,
      pst,
      post,
      exchangeWallet
    );
    const VRTHolderFeeTx = await createVRTHolderFeeTx(
      client,
      keyfile,
      amnt,
      pst,
      exchangeContract
    );

    const arAmnt =
      (await getTxFee(client, tx)) +
      ((await getTxFee(client, tradingPostFeeTx)) +
        (await getTxFee(client, VRTHolderFeeTx)));
    const pstAmnt =
      Math.ceil(amnt) +
      Math.ceil(
        Math.ceil(amnt) *
          (await getTradingPostFee(client, post, exchangeWallet))
      ) +
      Math.ceil(Math.ceil(amnt) * exchangeFee);

    if (arBalance >= arAmnt) {
      if (pstBalance && pstBalance >= pstAmnt) {
        return {
          txs: [tx, tradingPostFeeTx, VRTHolderFeeTx],
          ar: arAmnt,
          pst: pstAmnt,
        };
      } else {
        return "pst";
      }
    } else {
      return "ar";
    }
  }

  return "invalid";
};

export const sendOrder = async (
  client: Arweave,
  keyfile: JWKInterface | "use_wallet" | undefined,
  txs: Transaction[]
): Promise<void> => {
  for (const tx of txs) {
    await client.transactions.sign(tx, keyfile);
    await client.transactions.post(tx);

    for (const tag of tx.tags) {
      const key = tag.get("name", { decode: true, string: true });
      const value = tag.get("value", { decode: true, string: true });

      if (
        key === "Type" &&
        (value === "Swap" || value === "Buy" || value === "Sell")
      ) {
        axios.post(`https://hook.verto.exchange/api/transaction?id=${tx.id}`);
      }
    }
  }
};
