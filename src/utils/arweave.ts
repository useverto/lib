import Arweave from "arweave";

/**
 * Utility to create a general Arweave client instance
 */
export function createGenericClient(): Arweave {
  return new Arweave({
    host: "arweave.dev",
    port: 443,
    protocol: "https",
    // Disable the arweave logger
    logging: false,
  });
}

/**
 * Pull transaction data from Arweave
 * @param client An arweave client instance
 * @param id txID of the transaction
 */
export async function getTxData(client: Arweave, id: string): Promise<string> {
  // @ts-ignore
  const isBrowser = process.browser;

  if (isBrowser) {
    // @ts-ignore
    const cache = JSON.parse(localStorage.getItem("dataCache")) || {};

    if (id in cache) {
      return cache[id];
    }
  }

  const buf: string | Uint8Array = await client.transactions.getData(id, {
    decode: true,
    string: true,
  });

  if (isBrowser) {
    // @ts-ignore
    const cache = JSON.parse(localStorage.getItem("dataCache")) || {};

    cache[id] = buf.toString();

    // @ts-ignore
    localStorage.setItem("dataCache", JSON.stringify(cache));
  }

  return buf.toString();
}
