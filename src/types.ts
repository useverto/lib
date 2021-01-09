export interface VertoToken {
  id: string;
  name: string;
  ticker: string;
}

export interface EdgeQueryResponse {
  transactions: {
    pageInfo: {
      hasNextPage: boolean;
    };
    edges: {
      cursor: string;
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
  transaction: {
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
}
