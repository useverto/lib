import Arweave from "arweave";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import genesisQuery from "../queries/genesis.gql";
import { exchangeWallet, maxInt } from "@utils/constants";
import { getPostStake } from "./reputation";

export const getTradingPosts = async (client: Arweave): Promise<string[]> => {
  const response = (
    await query<EdgeQueryResponse>({
      query: genesisQuery,
      variables: {
        recipients: [exchangeWallet],
        num: maxInt,
      },
    })
  ).data.transactions;
  const gensisTxs = response.edges;
  const posts: string[] = [];
  const encountered: string[] = [];
  for (const tx of gensisTxs) {
    if (!encountered.find((addr) => addr === tx.node.owner.address)) {
      const stake = await getPostStake(client, tx.node.owner.address);

      if (stake > 0) {
        posts.push(tx.node.owner.address);
      }
      encountered.push(tx.node.owner.address);
    }
  }

  return posts;
};
