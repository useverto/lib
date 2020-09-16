import { query } from "@utils/gql";
import genesisQuery from "@queries/genesis.gql";
import { exchangeWallet } from "@utils/constants";

export const getTradingPosts = async () => {
  const gensisTxs = (
    await query({
      query: genesisQuery,
      variables: {
        recipients: [exchangeWallet],
      },
    })
  ).data.transactions.edges;

  let posts: string[] = [];
  gensisTxs.map((tx: any) => {
    if (!posts.find((addr) => addr === tx.node.owner.address)) {
      posts.push(tx.node.owner.address);
    }
  });

  return posts;
};
