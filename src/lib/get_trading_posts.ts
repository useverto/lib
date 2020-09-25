import { query } from "@utils/gql";
import genesisQuery from "../queries/genesis.gql";
import { EdgeQueryResponse } from "types";
import { exchangeWallet, maxInt } from "@utils/constants";

export const getTradingPosts = async (): Promise<string[]> => {
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
  gensisTxs.map((tx) => {
    if (!posts.find((addr) => addr === tx.node.owner.address)) {
      posts.push(tx.node.owner.address);
    }
  });

  return posts;
};
