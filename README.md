# Carbon - EVM Contracts

This repository contains the Ethereum (and all EVM-compatible chain) deposit and wrapped native token (SWTH) contracts for Carbon via the Polynetwork bridge.

## Setup

- **Ensure you're using node v12, it does not work with node v14**

1. Install [Truffle ~5.1.5](https://github.com/trufflesuite/truffle)
```
npm install -g truffle@5.1.5
```
2. Install [Ganache-CLI ^6.9.1](https://github.com/trufflesuite/ganache-cli)

    ```bash
    npm install -g ganache-cli
    ```

3. Install [Solhint ^2.1.0](https://github.com/protofire/solhint)

    ```bash
    npm install -g solhint
    ```

4. Run Ganache-CLI with:

    ```bash
    ganache-cli -m "ladder soft balcony kiwi sword shadow volcano reform cricket wall initial normal" -p 7545 -l 8000000
    ```

5. Install node modules with `npm install`
6. Run `truffle migrate` to deploy the contracts to Ganache
7. Run `truffle test` to run test files
8. `truffle test test/TestVault/*.js` can be used to test files in a folder

## LockProxy

The LockProxy contract at `contracts/LockProxy.sol` is a variation of PolyNetwork's [LockProxy](https://github.com/polynetwork/eth-contracts/blob/master/contracts/core/lock_proxy/LockProxy.sol), and is intended to interact with the CCM (CrossChainManager) contract of the [PolyNetwork](https://www.poly.network/).

The main purpose of the contract is to facilitate deposits and withdrawals into Switcheo TradeHub, which can be considered to be a side-chain.

## Deposits

To perform a deposit, the asset to be deposited must first be registered.
This is done through governance on Switcheo TradeHub, and will result in `LockProxy.registerAsset` being called by the CCM contract.

This registration associates an asset by its Ethereum address to a corresponding proxy address and asset hash on Switcheo TradeHub.
For example, there could be an asset with asset hash `0x746f6b656e` under Switcheo TradeHub proxy `0x213a5f9f0477b2cfc3a65120971a027e10f9a7ab`. If we want this asset to represent an Ethereum token with Ethereum address: `0xc86e930a5f5cb9230aef750665161b0bfff55484`, we would register `0xc86e930a5f5cb9230aef750665161b0bfff55484` and associate it to `0x213a5f9f0477b2cfc3a65120971a027e10f9a7ab` and `0x746f6b656e` using `LockProxy.registerAsset`.

After the asset is registered, `LockProxy.lock` can be called to perform a deposit.
This would require the user to have ETH in their address and to call the function using their own address.

## Wallet Contract

For the user's convenience, an alternative deposit flow that does not require the user to have ETH is provided.
To use this flow, the `LockProxy.getWalletAddress` function can be called to get a fixed deposit address based on an Ethereum address controllable by the user and a Switcheo TradeHub address.

The user can then send ETH or any supported Ethereum tokens to the deposit address. Any Ethereum token that implements the ERC20 `balanceOf` and `transfer` functions should be supported.

After the tokens are in the deposit address, any Ethereum address can call `LockProxy.createWallet` to create a `Wallet` contract at the deposit address.

To transfer the funds from the `Wallet` to the `LockProxy`, `LockProxy.lockFromWallet` can be called by any Ethereum address, as long as the owner of the `Wallet` signs a message authorizing the deposit.

`LockProxy.lockFromWallet` has `feeAddress` and `feeAmount` parameters, and it is intended that the Ethereum address that calls `createWallet` and `lockFromWallet` would collect fees through specifying those parameters.

The possibility of having a separate "WalletFactory" contract and "LockProxy" contract was considered as this could allow a single wallet to interact with multiple "LockProxy" contracts if needed, while still maintaining a single deposit address.

However, this structure would be more complicated, and if a new "LockProxy" is required, then it is likely a new "Wallet" contract would be required as well. So, for simplicity, the "LockProxy" contract acts as the "WalletFactory".

## Withdrawals

Withdrawals are initiated on Switcheo TradeHub, and would result in the `LockProxy.unlock` function being called by the CCM contract, the funds would then be transferred to the specified withdrawal address.

To send ETH, `call` is used instead of `transfer`. This follows the recommendation from [this report](https://diligence.consensys.net/blog/2019/09/stop-using-soliditys-transfer-now/), since the withdrawal address could be a contract.

## Extensions

To allow the funds in the `LockProxy` to be used for future features, the `addExtension` method is provided.
This method is intended to be called through the governance on Switcheo TradeHub.

A contract added as an extension can call `LockProxy.transferToExtension` which would transfer ETH to or approve tokens for the specified `receivingAddress`.

Extensions can be removed by the `removeExtension` method, also callable through Switcheo TradeHub governance.

## Addresses

### Ethereum

Devnet LockProxy (Rinkeby): check telegram chat

Mainnet LockProxy: 0x9a016ce184a22dbf6c17daa59eb7d3140dbd1c54


## Redeploy to devnet

Update `scripts/deploy_lockproxy.js`, ccmProxyAddress and counterpartChainId when necessary.

```bash
npx hardhat run scripts/deploy_lockproxy.js
```

Update `scripts/deploy_bridgeentrance.js`, lockProxyAddress when necessary.

```bash
npx hardhat run scripts/deploy_bridgeentrance.js
```

## Verify contract

Update addresses to verify

```bash
npx hardhat run scripts/verify.js
```

## Get wallet byte code hash

```bash
npx hardhat run scripts/getwalletbytecodehash.js
```
