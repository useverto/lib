export interface VertoToken {
  id: string;
  name: string;
  ticker: string;
  volume: number;
}

export interface EdgeQueryResponse {
  transactions: {
    edges: {
      node: {
        id: string;
        owner: {
          address: string;
        };
        quantity: {
          ar: string;
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
