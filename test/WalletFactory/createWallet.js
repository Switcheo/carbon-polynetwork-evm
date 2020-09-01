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
            const owner = '0xE28338b00b8bdcaB93623F99C5De2F2b33b740a9'
            const externalAddress = 'swth142ph88p9ju9wrmw65z6edq67f20p957m92ck9d'
            const chainId = 173

            const expectedAddress = await getWalletAddress(owner, externalAddress, chainId)
            console.log('expectedAddress', expectedAddress)
            await assertReversion(Wallet.at(expectedAddress), 'Cannot create instance of Wallet; no code at address')

            const result = await factory.createWallet(owner, externalAddress, chainId)
            console.log('Gas used:', result.receipt.gasUsed)

            await Wallet.at(expectedAddress)
        })
    })
})
