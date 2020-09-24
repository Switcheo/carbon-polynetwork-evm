# Switcheo Chain Ethereum Contract

This is the repo for the Switcheo Chain ETH contracts.

## Setup

1. Install [Truffle ^5.1.2](https://github.com/trufflesuite/truffle)
```
npm install -g truffle
```
2. Install [Ganache-CLI ^6.9.1](https://github.com/trufflesuite/ganache-cli)
```
npm install -g ganache-cli
```
3. Install [Solhint ^2.1.0](https://github.com/protofire/solhint)
```
npm install -g solhint
```
4. Run Ganache-CLI with:
```
ganache-cli -m "ladder soft balcony kiwi sword shadow volcano reform cricket wall initial normal" -p 7545 -l 8000000
```
5. Install node modules with `npm install`
6. Run `truffle migrate` to deploy the contracts to Ganache
7. Run `truffle test` to run test files
8. `truffle test test/TestVault/*.js` can be used to test files in a folder


## Addresses

Devnet LockProxy (Ropsten): 0xbc51Ebf652ff116902614879920087042e9E546b
