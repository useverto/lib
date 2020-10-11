<p align="center">
  <a href="https://verto.exchange">
    <img src="https://raw.githubusercontent.com/useverto/design/master/logo/logo_light.svg" alt="Verto logo (light version)" width="110" />
  </a>

  <h3 align="center">Verto Library</h3>

  <p align="center">
    Utilities for the Verto Exchange Network
  </p>

  <p align="center">
    <img src="https://github.com/useverto/lib/workflows/Test/badge.svg" alt="Test CI" />
    <img src="https://github.com/useverto/lib/workflows/Lint/badge.svg" alt="Lint CI" />
  </p>

</p>

## About

This repository contains all of the utilities to integrate Verto into your applications.

> Important Notice: Verto is in its Alpha stage. If you have a suggestion, idea, or find a bug, please report it! The Verto team will not be held accountable for any funds lost.

## Getting Started

### Installation

#### NPM:

```sh
npm install @verto/lib
```

or

```sh
yarn add @verto/lib
```

#### OpenBits:

```sh
openbits install @verto/lib@0.1.0-alpha
```

#### Arweave:

```
npm install https://arweave.net/uS-umpJMcB_zVYvaNxks41k3kdisdM9SbO8g2N5wdAI
```

or

```
yarn add https://arweave.net/uS-umpJMcB_zVYvaNxks41k3kdisdM9SbO8g2N5wdAI
```

### Initialization

```js
import Verto from "@verto/lib";
import Arweave from "arweave";

const arweave = Arweave.init();
const client = new Verto(arweave);
```

You can alternatively initialize without a preconfigured Arweave Client.

```js
import Verto from "@verto/lib";

const client = new Verto();
```

If you are using the trade functions, you will need to intialise with a valid Arweave keyfile:

```js
import Verto from "@verto/lib";
import keyfile from "./arweave.json";

const client = new Verto(keyfile);
```

### Usage

#### `getAssets(address)`

Returns a list of profit sharing token balances, which are supported by the Verto Exchange Network, for a given wallet address.

#### `getConfig(tradingPostAddress)`

Returns the configuration, from the latest genesis transaction, for a specific trading post.

#### `getExchanges(address)`

Returns a list of the latest five exchanges sent through the Verto Exchange Network, for a given wallet address.

#### `getPostStake(tradingPostAddress)`

Returns the stake of a specific trading post.

#### `getReputation(tradingPostAddress)`

Returns the reputation of a specific trading post.

#### `getTokens(contractID?)`

Returns a list of tokens supported by the Verto Exchange Network. You can optionally pass in a specific contract source.

#### `getTPTokens(tradingPostAddress)`

Returns a list of tokens supported by a specific trading post.

#### `getTradingPosts()`

Returns a list of trading post wallet addresses on the Verto Exchange Network.

#### `getTransactions(address)`

Returns a list of the latest five transactions for a given wallet address.

#### `recommendPost()`

Returns a recommended trading post address to trade with. Note: Uses a weighted random on reputations.

#### `price(contractID)`

Returns a JSON object of prices and dates corresponding to each of those prices. Note: You must pass in a valid PST contract ID.

#### `latestPrice(contractID)`

Related to `price()`, returns the price for the current day. Note: You must pass in a valid PST contract ID.

#### `volume(contractID)`

Returns a JSON object of volumes and dates corresponding to each of those volumes. Note: You must pass in a valid PST contract ID.

#### `latestVolume(contractID)`

Related to `volume()`, returns the volume for the current day. Note: You must pass in a valid PST contract ID.

#### `createOrder(orderType, amount, pstContractID, tradingPost, rate?)`

Returns a list of transactions & AR/PST prices for initiating the trades.

It also validates to ensure the wallet associated with the keyfile, has enough AR/PST amounts to make the trade.

- `orderType`
  - "buy" or "sell"
  - Type: string
- `amount`
  - The amount of currency you are inputting. Note: If you are selling, the amount must be an integer.
  - Type: number
- `pstContractID`
  - The PST you are looking to buy, or the PST you are selling.
  - Type: string
- `tradingPost`
  - The wallet address of the trading post you are using.
  - Type: string
- `rate?`
  - The rate (in units of AR/PST) that you wish to sell at. Note: This field is only necessary if you are selling.
  - Type: number

#### `sendOrder(txs)`

Accepts an array of Arweave transactions and subsequently signs & sends each using the configured keyfile.

## Special Thanks

- [Sam Williams](https://github.com/samcamwilliams)
- [Cedrik Boudreau](https://github.com/cedriking)
- [Aidan O'Kelly](https://github.com/aidanok)

## License

The code contained within this repository is licensed under the MIT license.
See [`./LICENSE`](./LICENSE) for more information.
