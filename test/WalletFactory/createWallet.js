const Wallet = artifacts.require('Wallet')
const { getWalletAddress, getWalletFactory, assertAsync, assertReversion, getWalletBytecodeHash } = require('../utils')

contract('Test createWallet', async (accounts) => {
    let factory

    beforeEach(async () => {
        factory = await getWalletFactory()
    })

    contract('when parameters are valid', async () => {
        it('creates a wallet at the expected address', async () => {
            console.log('wallet bytecodeHash', getWalletBytecodeHash())
            const nativeAddress = '0xE28338b00b8bdcaB93623F99C5De2F2b33b740a9'
            const externalAddress = '0x41fbaff59b973f5f14496c0d1ed06afa6aeac174'

            const expectedAddress = await getWalletAddress(nativeAddress, externalAddress)
            console.log('expectedAddress', expectedAddress)
            await assertReversion(Wallet.at(expectedAddress), 'Cannot create instance of Wallet; no code at address')

            const result = await factory.createWallet(nativeAddress, externalAddress)
            console.log('Gas used:', result.receipt.gasUsed)

            await Wallet.at(expectedAddress)
            await assertAsync(factory.nativeAddresses(expectedAddress), nativeAddress)
            await assertAsync(factory.externalAddresses(expectedAddress), externalAddress)
        })
    })
})
