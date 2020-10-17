const Wallet = artifacts.require('Wallet')
const { getWalletAddress, getLockProxy, assertAsync, assertReversion, getWalletBytecodeHash } = require('../utils')
const { ZERO_ADDR } = require('../constants')

contract('Test createWallet', async (accounts) => {
    const owner = '0xE28338b00b8bdcaB93623F99C5De2F2b33b740a9'
    const swthAddress = '0x213a5f9f0477b2cfc3a65120971a027e10f9a7ab'
    let proxy

    beforeEach(async () => {
        proxy = await getLockProxy()
    })

    contract('when parameters are valid', async () => {
        it('creates a wallet at the expected address', async () => {
            console.log('wallet bytecodeHash', getWalletBytecodeHash())

            const expectedAddress = await getWalletAddress(owner, swthAddress)
            console.log('expectedAddress', expectedAddress)
            await assertReversion(Wallet.at(expectedAddress), 'Cannot create instance of Wallet; no code at address')
            await assertAsync(proxy.wallets(expectedAddress), false)

            const result = await proxy.createWallet(owner, swthAddress)
            console.log('Gas used:', result.receipt.gasUsed)

            const wallet = await Wallet.at(expectedAddress)
            await assertAsync(wallet.owner(), owner)
            await assertAsync(wallet.swthAddress(), swthAddress)
            await assertAsync(proxy.wallets(expectedAddress), true)
        })
    })

    contract('when the ownerAddress is empty', async () => {
        it('raises an error', async () => {
            const expectedAddress = await getWalletAddress(ZERO_ADDR, swthAddress)
            await assertReversion(Wallet.at(expectedAddress), 'Cannot create instance of Wallet; no code at address')
            await assertReversion(proxy.createWallet(ZERO_ADDR, swthAddress), 'Empty ownerAddress')
            await assertReversion(Wallet.at(expectedAddress), 'Cannot create instance of Wallet; no code at address')
        })
    })
})
