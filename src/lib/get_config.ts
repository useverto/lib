import Arweave from "arweave";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import genesisQuery from "../queries/genesis.gql";

export const getConfig = async (
  client: Arweave,
  post: string,
  exchangeWallet: string
): Promise<JSON | "invalid"> => {
  const genesis = (
    await query<EdgeQueryResponse>({
      query: genesisQuery,
      variables: {
        owners: [post],
        recipients: [exchangeWallet],
        num: 1,
      },
    })
  ).data.transactions.edges[0]?.node.id;

  if (!genesis) {
    return "invalid";
  }

  const config = JSON.parse(
    (
      await client.transactions.getData(genesis, { decode: true, string: true })
    ).toString()
  );

  return config;
};
