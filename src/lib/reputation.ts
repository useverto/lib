import Arweave from "arweave";
import Community from "community-js";
import { exchangeContractSrc } from "@utils/constants";

const getBalance = async (client: Arweave, post: string): Promise<number> => {
  return parseFloat(
    client.ar.winstonToAr(await client.wallets.getBalance(post))
  );
};

export const getPostStake = async (
  client: Arweave,
  post: string
): Promise<number> => {
  const community = new Community(client);
  await community.setCommunityTx(exchangeContractSrc);

  return await community.getVaultBalance(post);
};

const getTimeStaked = async (
  client: Arweave,
  post: string
): Promise<number> => {
  const community = new Community(client);
  await community.setCommunityTx(exchangeContractSrc);

  const currentHeight = (await client.network.getInfo()).height;

  const vaults = (await community.getState()).vault[post];
  for (const vault of vaults) {
    if (vault.end > currentHeight) {
      return currentHeight - vault.start;
    }
  }

  return 0;
};

export const getReputation = async (
  client: Arweave,
  post: string
): Promise<number> => {
  const stakeWeighted = ((await getPostStake(client, post)) * 1) / 2,
    timeStakedWeighted = ((await getTimeStaked(client, post)) * 1) / 3,
    balanceWeighted = ((await getBalance(client, post)) * 1) / 6;

  return parseFloat(
    (stakeWeighted + timeStakedWeighted + balanceWeighted).toFixed(3)
  );
};
