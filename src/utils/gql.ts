// Client for the Arweave GraphQL endpoint
import fetch from "node-fetch";

interface StringMap {
  [key: string]: string | string[] | Record<string, unknown> | number;
}

/**
 * Represents a graphql query
 */
export interface GrapqlQuery {
  /**
   * The graphql query as a string
   */
  query: string;
  /**
   * The graphql variables in the given query.
   */
  variables?: string | StringMap;
}

export interface GraphQLResponse<T> {
  data: T;
}

/**
 * Perform a HTTP request to the graphql server.
 * @param graphql The response body as string
 */
async function request(graphql: string) {
  const requestOptions = {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: graphql,
  };
  const res = await fetch("https://arweave.net/graphql", requestOptions);
  return await res.clone().json();
}

/**
 * Execute a graphql query with variables.
 * @param payload A graphql query and its variables.
 */
export async function query<T>({
  query,
  variables,
}: GrapqlQuery): Promise<GraphQLResponse<T>> {
  const graphql = JSON.stringify({
    query,
    variables,
  });
  return await request(graphql);
}

/**
 * Execute a simple graphql query without variables.
 * @param query The graphql query to be executed.
 */
export async function simpleQuery<T>(
  query: string
): Promise<GraphQLResponse<T>> {
  const graphql = JSON.stringify({
    query,
    variables: {},
  });
  return await request(graphql);
}
