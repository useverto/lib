import { isStateInterfaceWithValidity } from "@utils/arweave";
import Arweave from "arweave";
import { getContract } from "cacheweave";

const getBalance = async (client: Arweave, post: string): Promise<number> => {
  return parseFloat(
    client.ar.winstonToAr(await client.wallets.getBalance(post))
  );
};

export const getPostStake = async (
  client: Arweave,
  post: string,
  exchangeContract: string
): Promise<number> => {
  const res = await getContract(client, exchangeContract);
  if (isStateInterfaceWithValidity(res)) return 0;
  const vault = res.vault;

  let stake = 0;
  if (post in vault) {
    const height = (await client.network.getInfo()).height;
    const filtered = vault[post].filter((a) => height < a.end);

    stake += filtered.map((a) => a.balance).reduce((a, b) => a + b, 0);
  }

  return stake;
};

const getTimeStaked = async (
  client: Arweave,
  post: string,
  exchangeContract: string
): Promise<number> => {
  const res = await getContract(client, exchangeContract);
  if (isStateInterfaceWithValidity(res)) return 0;
  const vault = res.vault;

  if (post in vault) {
    const height = (await client.network.getInfo()).height;

    for (const element of vault[post]) {
      if (height < element.end) {
        return element.end - element.start;
      }
    }
  }

  return 0;
};

export const getReputation = async (
  client: Arweave,
  post: string,
  exchangeContract: string
): Promise<number> => {
  const stakeWeighted =
      ((await getPostStake(client, post, exchangeContract)) * 1) / 2,
    timeStakedWeighted =
      ((await getTimeStaked(client, post, exchangeContract)) * 1) / 3,
    balanceWeighted = ((await getBalance(client, post)) * 1) / 6;

  return parseFloat(
    (stakeWeighted + timeStakedWeighted + balanceWeighted).toFixed(3)
  );
};
