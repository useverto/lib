import Arweave from "arweave";
import { query } from "@utils/gql";
import { EdgeQueryResponse } from "types";
import exchangesQuery from "../queries/exchanges.gql";
import { getTokens } from "./get_tokens";
import moment from "moment";
import confirmationQuery from "../queries/confirmation.gql";

export const getExchanges = async (
  client: Arweave,
  addr: string
): Promise<
  {
    id: string;
    timestamp: string;
    type: string;
    sent: string;
    received: string;
    status: string;
    duration: string;
  }[]
> => {
  const exchanges: {
    id: string;
    timestamp: string;
    type: string;
    sent: string;
    received: string;
    status: string;
    duration: string;
  }[] = [];

  const txs = (
    await query<EdgeQueryResponse>({
      query: exchangesQuery,
      variables: {
        owners: [addr],
        num: 5,
      },
    })
  ).data.transactions.edges;

  const psts = await getTokens(client);

  txs.map(({ node }) => {
    const type = node.tags.find((tag) => tag.name === "Type")?.value;
    if (type) {
      const tokenTag = type === "Buy" ? "Token" : "Contract";
      const token = node.tags.find(
        (tag: { name: string; value: string }) => tag.name === tokenTag
      )?.value!;
      const ticker = psts.find((pst) => pst.id === token)?.ticker;

      const sent =
        type === "Buy"
          ? parseFloat(node.quantity.ar) + " AR"
          : JSON.parse(
              node.tags.find(
                (tag: { name: string; value: string }) => tag.name === "Input"
              )?.value!
            )["qty"] +
            " " +
            ticker;
      const received = "??? " + (type === "Buy" ? ticker : "AR");

      exchanges.push({
        id: node.id,
        timestamp: node.block
          ? moment.unix(node.block.timestamp).format("YYYY-MM-DD hh:mm:ss")
          : "not mined yet",
        type,
        sent,
        received,
        status: "pending",
        duration: "not completed",
      });
    }
  });

  for (let i = 0; i < exchanges.length; i++) {
    const match = (
      await query<EdgeQueryResponse>({
        query: confirmationQuery,
        variables: {
          txID: exchanges[i].id,
        },
      })
    ).data.transactions.edges;

    if (match[0]) {
      exchanges[i].status = "success";

      if (match[0].node.block) {
        const start = moment(exchanges[i].timestamp);
        const end = moment(
          moment
            .unix(match[0].node.block.timestamp)
            .format("YYYY-MM-DD hh:mm:ss")
        );
        const duration = moment.duration(end.diff(start));

        exchanges[i].duration = duration.humanize();
      } else {
        exchanges[i].duration = "not mined yet";
      }

      const receivedTag = match[0].node.tags.find(
        (tag: { name: string; value: string }) => tag.name === "Received"
      );
      if (receivedTag) {
        exchanges[i].received = receivedTag.value;
      }
    }
  }

  return exchanges;
};
