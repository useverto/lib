import Arweave from "arweave";
import { all } from "ar-gql";
import genesisQuery from "../queries/genesis.gql";
import { getPostStake } from "./reputation";

export const getTradingPosts = async (
  client: Arweave,
  exchangeContract: string,
  exchangeWallet: string
): Promise<string[]> => {
  const genesisTxs = await all(genesisQuery, {
    recipients: [exchangeWallet],
  });

  const posts: string[] = [];
  const encountered: string[] = [];
  for (const tx of genesisTxs) {
    if (!encountered.find((addr) => addr === tx.node.owner.address)) {
      const stake = await getPostStake(
        client,
        tx.node.owner.address,
        exchangeContract
      );

      if (stake > 0) {
        posts.push(tx.node.owner.address);
      }
      encountered.push(tx.node.owner.address);
    }
  }

  return posts;
};
