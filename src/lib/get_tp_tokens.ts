import Arweave from "arweave";
import { getConfig } from "./get_config";
import { VertoToken } from "types";
import { getTokens } from "./get_tokens";

export const getTPTokens = async (
  client: Arweave,
  post: string
): Promise<VertoToken[]> => {
  const config = await getConfig(client, post);

  const tokens: VertoToken[] = await getTokens(client);
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

  return tokens;
};
