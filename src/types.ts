export interface VertoToken {
  id: string;
  ticker: string;
}

export interface EdgeQueryResponse {
  transactions: {
    edges: {
      node: {
        id: string;
        owner: {
          address: string;
        };
        block: {
          timestamp: number;
        };
        tags: {
          name: string;
          value: string;
        }[];
      };
    }[];
  };
}
