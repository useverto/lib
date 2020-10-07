import Arweave from "arweave";
import Community from "community-js";
import { exchangeContractSrc, exchangeWallet, maxInt } from "@utils/constants";
import { query } from "@utils/gql";
import genesisQuery from "../queries/genesis.gql";
import { EdgeQueryResponse } from "types";

export const getTradingPosts = async (client: Arweave): Promise<string[]> => {
  const community = new Community(client);
  await community.setCommunityTx(exchangeContractSrc);

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
      const stake = await community.getVaultBalance(tx.node.owner.address);
      if (stake > 0) {
        posts.push(tx.node.owner.address);
      }
      encountered.push(tx.node.owner.address);
    }
  }

  return posts;
};
