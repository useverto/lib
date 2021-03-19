import { weightedRandom } from "@utils/weighted_random";
import Arweave from "arweave";
import { getTradingPosts } from "./get_trading_posts";
import { getReputation } from "./reputation";

export const recommendPost = async (
  client: Arweave,
  useCache: boolean,
  exchangeContract: string,
  exchangeWallet: string
): Promise<string | undefined> => {
  const tradingPosts = await getTradingPosts(
    client,
    useCache,
    exchangeContract,
    exchangeWallet
  );

  const reputations: Record<string, number> = {};
  let total = 0;
  for (const post of tradingPosts) {
    const reputation = await getReputation(
      client,
      post,
      useCache,
      exchangeContract
    );

    reputations[post] = reputation;
    total += reputation;
  }

  const posts: Record<string, number> = {};
  for (const post of tradingPosts) {
    posts[post] = reputations[post] / total;
  }

  return weightedRandom(posts);
};
