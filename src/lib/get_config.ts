import Arweave from "arweave";
import { run } from "ar-gql";
import genesisQuery from "../queries/genesis.gql";

export const getConfig = async (
  client: Arweave,
  post: string,
  exchangeWallet: string
): Promise<JSON | string> => {
  const genesis = (
    await run(genesisQuery, {
      owners: [post],
      recipients: [exchangeWallet],
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
