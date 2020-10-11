import Arweave from "arweave";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import latestInteractionQuery from "../queries/latestInteraction.gql";
import { exchangeContractSrc } from "@utils/constants";
import { readContract } from "smartweave";

const getBalance = async (client: Arweave, post: string): Promise<number> => {
  return parseFloat(
    client.ar.winstonToAr(await client.wallets.getBalance(post))
  );
};

const latestInteraction = async (contract: string) => {
  return (
    await query<EdgeQueryResponse>({
      query: latestInteractionQuery,
      variables: {
        contract,
      },
    })
  ).data.transactions.edges[0]?.node.id;
};

const getStake = async (
  client: Arweave,
  vault: { [addr: string]: { balance: number; end: number; start: number }[] },
  addr: string
) => {
  let stake = 0;
  if (addr in vault) {
    const height = (await client.network.getInfo()).height;
    const filtered = vault[addr].filter((a) => height < a.end);

    stake += filtered.map((a) => a.balance).reduce((a, b) => a + b, 0);
  }
  return stake;
};

export const getPostStake = async (
  client: Arweave,
  post: string
): Promise<number> => {
  // @ts-ignore
  const isBrowser = process.browser;

  const latest = await latestInteraction(exchangeContractSrc);
  let stake;
  if (isBrowser) {
    // @ts-ignore
    const cache = JSON.parse(localStorage.getItem("smartweaveCache")) || {};

    if (exchangeContractSrc in cache) {
      if (cache[exchangeContractSrc].latest === latest) {
        stake = await getStake(
          client,
          cache[exchangeContractSrc].state.vault,
          post
        );
      } else {
        const contract = await readContract(client, exchangeContractSrc);

        stake = await getStake(client, contract.vault, post);

        cache[exchangeContractSrc].latest = latest;
        cache[exchangeContractSrc].state = contract;
        // @ts-ignore
        localStorage.setItem("smartweaveCache", JSON.stringify(cache));
      }
    } else {
      const contract = await readContract(client, exchangeContractSrc);

      stake = await getStake(client, contract.vault, post);

      cache[exchangeContractSrc] = {
        latest,
        state: contract,
      };
      // @ts-ignore
      localStorage.setItem("smartweaveCache", JSON.stringify(cache));
    }
  } else {
    const contract = await readContract(client, exchangeContractSrc);

    stake = await getStake(client, contract.vault, post);
  }

  return stake;
};

const getTime = async (
  client: Arweave,
  vault: { [addr: string]: { balance: number; end: number; start: number }[] },
  addr: string
) => {
  if (addr in vault) {
    const height = (await client.network.getInfo()).height;

    for (const element of vault[addr]) {
      if (height < element.end) {
        return element.end - element.start;
      }
    }
  }
  return 0;
};

const getTimeStaked = async (
  client: Arweave,
  post: string
): Promise<number> => {
  // @ts-ignore
  const isBrowser = process.browser;

  const latest = await latestInteraction(exchangeContractSrc);
  let time;
  if (isBrowser) {
    // @ts-ignore
    const cache = JSON.parse(localStorage.getItem("smartweaveCache")) || {};

    if (exchangeContractSrc in cache) {
      if (cache[exchangeContractSrc].latest === latest) {
        time = await getTime(
          client,
          cache[exchangeContractSrc].state.vault,
          post
        );
      } else {
        const contract = await readContract(client, exchangeContractSrc);

        time = await getTime(client, contract.vault, post);

        cache[exchangeContractSrc].latest = latest;
        cache[exchangeContractSrc].state = contract;
        // @ts-ignore
        localStorage.setItem("smartweaveCache", JSON.stringify(cache));
      }
    } else {
      const contract = await readContract(client, exchangeContractSrc);

      time = await getTime(client, contract.vault, post);

      cache[exchangeContractSrc] = {
        latest,
        state: contract,
      };
      // @ts-ignore
      localStorage.setItem("smartweaveCache", JSON.stringify(cache));
    }
  } else {
    const contract = await readContract(client, exchangeContractSrc);

    time = await getTime(client, contract.vault, post);
  }

  return time;
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
