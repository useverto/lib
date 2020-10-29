import Arweave from "arweave";
import { getConfig } from "./get_config";
import { VertoToken } from "types";
import { popularTokens, getTokens } from "./tokens";

const unique = (arr: VertoToken[]): VertoToken[] => {
  const seen: Record<string, boolean> = {};
  return arr.filter((item) => {
    return item.id in seen ? false : (seen[item.id] = true);
  });
};

export const getTPTokens = async (
  client: Arweave,
  post: string,
  exchangeContract: string,
  exchangeWallet: string
): Promise<VertoToken[]> => {
  const config = await getConfig(client, post, exchangeWallet);

  const tokens: VertoToken[] = [
    ...(await popularTokens(client, exchangeWallet)),
    ...(await getTokens(client, exchangeContract, exchangeWallet)),
  ];
  // @ts-ignore
  config.blockedTokens.map((token: string) => {
    const element = tokens.find((element) => element.id === token);
    let index = -1;
    if (element) {
      index = tokens.indexOf(element);
    }
    if (index > -1) {
      tokens.splice(index, 1);
    }
  });

  return unique(tokens);
};
