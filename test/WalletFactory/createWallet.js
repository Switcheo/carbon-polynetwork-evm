const Wallet = artifacts.require('Wallet')
const { getWalletFactory, assertAsync, assertReversion } = require('../utils')

contract('Test createWallet', async (accounts) => {
    let factory

    beforeEach(async () => {
        factory = await getWalletFactory()
    })

    contract('when parameters are valid', async () => {
        it('creates a wallet at the expected address', async () => {
            const nativeAddress = '0x359EF15fB3E86dDF050228f03336979fA5212480'
            const externalAddress = 'swth1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'
            const vaultAddress = '0x571037CC2748c340e3C6d9c7AF589c6D65806618'

            const expectedAddress = await factory.createWallet.call(nativeAddress, externalAddress, vaultAddress)
            await assertReversion(Wallet.at(expectedAddress), 'Cannot create instance of Wallet; no code at address')

            const result = await factory.createWallet(nativeAddress, externalAddress, vaultAddress)
            console.log('Gas used:', result.receipt.gasUsed)

            const wallet = await Wallet.at(expectedAddress)
            await assertAsync(wallet.nativeAddress(), nativeAddress)
            await assertAsync(wallet.externalAddress(), externalAddress)
            await assertAsync(wallet.vaultAddress(), vaultAddress)
        })
    })
})
