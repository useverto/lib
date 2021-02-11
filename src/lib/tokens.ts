import Arweave from "arweave";
import { VertoToken } from "types";
import { getContract, getData } from "cacheweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { volume } from "./volume";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import tokensQuery from "../queries/tokens.gql";
import { isStateInterfaceWithValidity } from "@utils/arweave";

export const getTokens = async (
  client: Arweave,
  exchangeContract: string
): Promise<VertoToken[]> => {
  const contractIDs: string[] = [exchangeContract];

  // TODO(@johnletey): Use `localPorridge` as well.
  // @ts-ignore
  if (typeof window !== "undefined") {
    // @ts-ignore
    const cache = JSON.parse(localStorage.getItem("tokens") || "[]");

    cache.map((id: string) => contractIDs.push(id));
  }

  const tokens: {
    id: string;
    name: string;
    ticker: string;
    volume: number;
  }[] = [];
  for (const contractID of contractIDs) {
    try {
      const res = await getContract(client, contractID);
      const contract = isStateInterfaceWithValidity(res) ? res.state : res;

      const volumeData = await volume(contractID);

      tokens.push({
        id: contractID,
        name: contract.name,
        ticker: contract.ticker,
        volume: volumeData.volume.reduce((a, b) => a + b, 0),
      });
    } catch (err) {
      // token is invalid, don't do anything
    }
  }

  tokens.sort((a, b) => b.volume - a.volume);

  const returnedTokens: VertoToken[] = [];
  tokens.map((token) =>
    returnedTokens.push({
      id: token.id,
      name: token.name,
      ticker: token.ticker,
    })
  );

  return returnedTokens;
};

export const saveToken = async (
  client: Arweave,
  contract: string,
  keyfile: JWKInterface,
  exchangeContract: string,
  exchangeWallet: string
): Promise<string | void> => {
  // TODO(@johnletey): Use `localPorridge` as well.
  // @ts-ignore
  if (typeof window !== "undefined") {
    const tokens = await getTokens(client, exchangeContract);

    if (!tokens.find((token) => token.id === contract)) {
      const userTokenTxs = (
        await query<EdgeQueryResponse>({
          query: `
            query($exchange: String!, $user: String!, $contract: [String!]!) {
              transactions(
                owners: [$user]
                recipients: [$exchange]
                tags: [
                  { name: "Exchange", values: "Verto" }
                  { name: "Type", values: "Token" }
                  { name: "Contract", values: $contract }
                ]
                first: 2147483647
              ) {
                edges {
                  node {
                    owner {
                      address
                    }
                  }
                }
              }
            }
          `,
          variables: {
            exchange: exchangeWallet,
            user: await client.wallets.jwkToAddress(keyfile),
            contract,
          },
        })
      ).data.transactions.edges;

      if (userTokenTxs.length === 0) {
        const tags = {
          Exchange: "Verto",
          Type: "Token",
          Contract: contract,
        };

        const tx = await client.createTransaction(
          {
            target: exchangeWallet,
            data: Math.random().toString().slice(-4),
          },
          keyfile
        );
        for (const [key, value] of Object.entries(tags)) {
          tx.addTag(key, value);
        }

        await client.transactions.sign(tx, keyfile);
        await client.transactions.post(tx);
      }

      // @ts-ignore
      const cache = JSON.parse(localStorage.getItem("tokens") || "[]");
      cache.push(contract);
      // @ts-ignore
      localStorage.setItem("tokens", JSON.stringify(cache));
    }

    return contract;
  }
};

export const popularTokens = async (
  client: Arweave,
  exchangeWallet: string
): Promise<VertoToken[]> => {
  const tokensTxs = (
    await query<EdgeQueryResponse>({
      query: tokensQuery,
      variables: {
        exchange: exchangeWallet,
      },
    })
  ).data.transactions.edges;

  const tokens: {
    id: string;
    name: string;
    ticker: string;
    amnt: number;
    valid: boolean;
  }[] = [];
  tokensTxs.map(({ node }) => {
    const idTag = node.tags.find((tag) => tag.name === "Contract");
    if (idTag) {
      const id = idTag.value;
      if (!tokens.find((entry) => entry.id === id) && id !== "") {
        tokens.push({
          id,
          name: "",
          ticker: "",
          amnt: 0,
          valid: true,
        });
      }
    }
  });

  for (let i = 0; i < tokens.length; i++) {
    try {
      const rawContract = await getData(client, tokens[i].id);
      const contract = JSON.parse(rawContract);

      tokens[i].name = contract.name;
      tokens[i].ticker = contract.ticker;

      let tokenTxs = (
        await query<EdgeQueryResponse>({
          query: `
            query($exchange: String!, $contract: [String!]!) {
              transactions(
                recipients: [$exchange]
                tags: [
                  { name: "Exchange", values: "Verto" }
                  { name: "Type", values: "Token" }
                  { name: "Contract", values: $contract }
                ]
                first: 2147483647
              ) {
                edges {
                  node {
                    owner {
                      address
                    }
                  }
                }
              }
            }
          `,
          variables: {
            exchange: exchangeWallet,
            contract: tokens[i].id,
          },
        })
      ).data.transactions.edges;
      const seen: Record<string, boolean> = {};
      tokenTxs = tokenTxs.filter(({ node }) => {
        return node.owner.address in seen
          ? false
          : (seen[node.owner.address] = true);
      });
      tokens[i].amnt = tokenTxs.length;
    } catch (err) {
      tokens[i].valid = false;
    }
  }

  tokens.sort((a, b) => b.amnt - a.amnt);

  const returnedTokens: VertoToken[] = [];
  tokens.map((token) => {
    if (token.valid) {
      returnedTokens.push({
        id: token.id,
        name: token.name,
        ticker: token.ticker,
      });
    }
  });

  return returnedTokens.splice(0, 10);
};
