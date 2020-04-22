const Vault = artifacts.require('Vault')
const WalletFactory = artifacts.require('WalletFactory')
const Wallet = artifacts.require('Wallet')
const JRCoin = artifacts.require('JRCoin')

const Web3 = require('web3')
const web3 = new Web3(Web3.givenProvider)

const { ETHER_ADDR } = require('../constants')

async function getVault() { return await Vault.deployed() }
async function getWalletFactory() { return await WalletFactory.deployed() }
async function getJrc() { return await JRCoin.deployed() }

function getWalletBytecodeHash() {
    const encodedParams = web3.eth.abi.encodeParameters([], []).slice(2)
    const constructorByteCode = `${Wallet.bytecode}${encodedParams}`
    return web3.utils.keccak256(constructorByteCode)
}

async function getWalletAddress(nativeAddress, externalAddress, vaultAddress) {
    const factory = await getWalletFactory()
    return factory.getWalletAddress(nativeAddress, externalAddress, vaultAddress, getWalletBytecodeHash())
}

async function createWallet({ nativeAddress, externalAddress, vaultAddress }) {
    const factory = await getWalletFactory()
    const walletAddress = await factory.createWallet.call(nativeAddress, externalAddress, vaultAddress)
    await factory.createWallet(nativeAddress, externalAddress, vaultAddress)

    return Wallet.at(walletAddress)
}

function assertEqual(valueA, valueB) {
    if (valueA.toString !== undefined) { valueA = valueA.toString() }
    if (valueB.toString !== undefined) { valueB = valueB.toString() }
    assert.equal(valueA, valueB)
}

async function assertAsync(promise, value) {
    const result = await promise
    assertEqual(result, value)
}

async function assertReversion(promise, errorMessage) {
    try {
        await promise
    } catch (error) {
        if (errorMessage !== undefined) {
            const messageFound = error.message.search(errorMessage) >= 0
            assert(messageFound, `Expected "${errorMessage}", got ${error} instead`)
        } else {
            const revertFound = error.message.search('revert') >= 0
            assert(revertFound, `Expected "revert", got ${error} instead`)
        }
        return
    }
    assert.fail('Expected an EVM revert but no error was encountered')
}

async function assertBalance(user, token, amount) {
    if (token === ETHER_ADDR) {
        await assertAsync(web3.eth.getBalance(user), amount)
        return
    }
    await assertAsync(token.balanceOf(user), amount)
}

module.exports = {
    web3,
    getVault,
    getWalletBytecodeHash,
    getWalletFactory,
    getWalletAddress,
    getJrc,
    createWallet,
    assertEqual,
    assertAsync,
    assertReversion,
    assertBalance
}
