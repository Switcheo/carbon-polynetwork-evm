const WalletFactory = artifacts.require('WalletFactory')
const Wallet = artifacts.require('Wallet')

async function getWalletFactory() { return await WalletFactory.deployed() }

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

module.exports = {
    getWalletFactory,
    createWallet,
    assertEqual,
    assertAsync,
    assertReversion
}
