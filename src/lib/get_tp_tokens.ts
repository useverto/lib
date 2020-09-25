import Arweave from "arweave";
import { getConfig } from "./get_config";
import { VertoToken } from "types";
import { getTxData } from "@utils/arweave";

export const getTPTokens = async (
  client: Arweave,
  post: string
): Promise<VertoToken[]> => {
  const config = await getConfig(client, post);

  const tokens: VertoToken[] = [];
  // @ts-ignore
  for (const id of config.acceptedTokens) {
    const rawContractData = await getTxData(client, id);
    const contractData = JSON.parse(rawContractData);

    tokens.push({
      id,
      name: contractData.name,
      ticker: contractData.ticker,
    });
  }

  return tokens;
};
