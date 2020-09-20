<p align="center">
  <a href="https://verto.exchange">
    <img src="https://raw.githubusercontent.com/useverto/design/master/logo/logo_light.svg" alt="Verto logo (light version)" width="110" />
  </a>

  <h3 align="center">Verto Lib</h3>

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

#### Yarn:

```sh
yarn add @verto/lib
```

#### OpenBits:

> Coming soon!

#### Arweave:

> Coming soon!

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

### Usage

#### `getAssets(address)`

Returns a list of balances that the given address has in tokens supported by the Verto Exchange Network.

#### `getTokens(contractID?)`

Returns a list of tokens supported by the Verto Exchange Network. You can optionally pass in a specific contract source.

#### `getTradingPosts()`

Returns a list of trading post wallet addresses on the Verto Exchange Network.

#### `price(contractID)`

Returns a JSON object of prices and dates corresponding to each of those prices. Note: You must pass in a valid PST contract ID.

#### `volume(contractID)`

Returns a JSON object of volumes and dates corresponding to each of those volumes. Note: You must pass in a valid PST contract ID.

## Special Thanks

- [Sam Williams](https://github.com/samcamwilliams)
- [Cedrik Boudreau](https://github.com/cedriking)
- [Aidan O'Kelly](https://github.com/aidanok)

## License

The code contained within this repository is licensed under the MIT license.
See [`./LICENSE`](./LICENSE) for more information.
