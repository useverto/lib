## Shared Liquidity Pools

> This algorithm is a WIP. Feel free to contribute.

### Abstract

With the current architecture of the Verto Protocol, preserving liquidity for the expanding network is, and will continue to become, a challenge. To combat this, the following algorithm could be built into the protocol to facilitate shared liquidity pools for an automated market maker (AMM). This will allow the protocol to correct and fairly distribute liquidity across its network. Additionally, this will allow native cross-chain swapping with a decentralized, distributed, off-chain price consensus.

### Goals

1. Preserve and incentivize growing, shared liquidity pools
2. Ensure fair distribution of liquidity for said pools
3. Ensure trading post incentive alignment

### Algorithm

#### Variables
For each trading post, *P*:

Let *B* = Open buy order value (AR)
Let *S* = Open sell order value (AR)
Let *M* = Number of open sell orders
Let *R* = Trading post fee percentage

For all trading posts, *ΣP*:

Let *r* = Average sell rate of closed orders in a given period of time (**TBD**)
Let *f* = Average trading post fee percentage
Let *l* = Total number of trading posts

#### Graph
Each *P* contains a set of three points [*i*, *j*, *k*] determined by:

*i* = (*B*, *S*)
*j* = (*M*, *r*)
*k* = (*R*, *f*)