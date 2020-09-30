import { weightedRandom } from "@utils/weighted_random";
import Arweave from "arweave";
import { getTradingPosts } from "./get_trading_posts";
import { getReputation } from "./reputation";

export const recommendPost = async (
  client: Arweave
): Promise<string | undefined> => {
  const tradingPosts = await getTradingPosts();

  const reputations: Record<string, number> = {};
  let total = 0;
  for (const post of tradingPosts) {
    const reputation = await getReputation(client, post);

    reputations[post] = reputation;
    total += reputation;
  }

  const posts: Record<string, number> = {};
  for (const post of tradingPosts) {
    posts[post] = reputations[post] / total;
  }

  return weightedRandom(posts);
};