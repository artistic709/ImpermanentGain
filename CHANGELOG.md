# Changelog

## V1 to V2 transistion:

- upgrade Solidity version from `0.5.17` to `0.8.7`
- abstract template with basic functions
- tokenize long/short position into ERC20 token
- add `mintExactA/B` function for better UX
- better token naming

## TokenFactory

A factory that deploys [EIP1167](https://eips.ethereum.org/EIPS/eip-1167) minimal proxy of mintable ERC20 token

## iGain V2 instances

### IL
The V2 version of iGain V1, almost identical except for a configurable leverage

### AAVE IRS
Tokenized incurred borrow interest of AAVE within a given period

### Yearn IRS
Tokenized incurred yield of Yearn within a given period

### Delta
Tokenized price movement by a sigmoid function
