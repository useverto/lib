## Preserving Liquidity Across the Verto Protocol

> This algorithm is a WIP. Feel free to contribute or make corrections.

### Summary

With the current architecture of the Verto Protocol, preserving liquidity for the expanding network is, and will continue to become, a challenge. To combat this, the following algorithm could be built into the Verto Library to auto-select a trading post based on the criteria below. By not placing the trading post selection with the user, the protocol can algorithmically correct and evenly distribute liquidity across the network. 

### Goals

1. Preserve orderbooks without shared liquidity across trading posts
2. Ensure fair trading post fees
3. Ensure incentive alignment

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