const Wallet = artifacts.require('Wallet')
const { assertAsync, assertReversion } = require('../utils')
const { ZERO_ADDR } = require('../constants')

contract('Test initialize', async (accounts) => {
    contract('when parameters are valid', async () => {
        it('initializes the wallet\'s properties', async () => {
            const externalAddress = 'swth1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'
            const vaultAddress = '0x571037CC2748c340e3C6d9c7AF589c6D65806618'

            const wallet = await Wallet.new()
            await assertAsync(wallet.externalAddress(), '')
            await assertAsync(wallet.vaultAddress(), ZERO_ADDR)

            await wallet.initialize(externalAddress, vaultAddress)

            await assertAsync(wallet.externalAddress(), externalAddress)
            await assertAsync(wallet.vaultAddress(), vaultAddress)
        })
    })

    contract('when it is called twice', async () => {
        it('raises an error', async () => {
            const externalAddress = 'swth1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'
            const vaultAddress = '0x571037CC2748c340e3C6d9c7AF589c6D65806618'

            const wallet = await Wallet.new()
            await wallet.initialize(externalAddress, vaultAddress)

            await assertAsync(wallet.externalAddress(), externalAddress)
            await assertAsync(wallet.vaultAddress(), vaultAddress)

            const reinitialize = wallet.initialize(externalAddress, vaultAddress)
            await assertReversion(reinitialize, 'Contract already initialized')
        })
    })
})
