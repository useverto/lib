import { query } from "@utils/gql";
import genesisQuery from "../queries/genesis.gql";
import { exchangeWallet } from "@utils/constants";
import { EdgeQueryResponse } from "types";

export const getTradingPosts = async () => {
  const response = (
    await query<EdgeQueryResponse>({
      query: genesisQuery,
      variables: {
        recipients: [exchangeWallet],
      },
    })
  ).data.transactions
  const gensisTxs = response.edges;
  let posts: string[] = [];
  gensisTxs.map((tx) => {
    if (!posts.find((addr) => addr === tx.node.owner.address)) {
      posts.push(tx.node.owner.address);
    }
  });

  return posts;
};
