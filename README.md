# Switcheo Chain Ethereum Contract

This is the repo for the Switcheo Chain ETH contracts.

## Setup

1. Install [Truffle ^5.0.29](https://github.com/trufflesuite/truffle)
```
npm install -g truffle
```
2. Install [Ganache-CLI ^6.5.0](https://github.com/trufflesuite/ganache-cli/tree/v6.5.0)
```
$ npm install -g ganache-cli
```
3. Run Ganache-CLI with:
```
$ ganache-cli -m "ladder soft balcony kiwi sword shadow volcano reform cricket wall initial normal" -p 7545 -l 8000000
```
4. Install node modules with `npm install`
5. Run `truffle migrate` to deploy the contracts to Ganache
6. Run `truffle test` to run test files
7. `truffle test test/TestVault/*.js` can be used to test files in a folder
