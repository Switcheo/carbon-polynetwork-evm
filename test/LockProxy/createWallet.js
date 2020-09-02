const Wallet = artifacts.require('Wallet')
const { getWalletAddress, getLockProxy, assertAsync, assertReversion, getWalletBytecodeHash } = require('../utils')

contract('Test createWallet', async (accounts) => {
    let proxy

    beforeEach(async () => {
        proxy = await getLockProxy()
    })

    contract('when parameters are valid', async () => {
        it('creates a wallet at the expected address', async () => {
            console.log('wallet bytecodeHash', getWalletBytecodeHash())
            const owner = '0xE28338b00b8bdcaB93623F99C5De2F2b33b740a9'
            const swthAddress = 'swth142ph88p9ju9wrmw65z6edq67f20p957m92ck9d'

            const expectedAddress = await getWalletAddress(owner, swthAddress)
            console.log('expectedAddress', expectedAddress)
            await assertReversion(Wallet.at(expectedAddress), 'Cannot create instance of Wallet; no code at address')

            const result = await proxy.createWallet(owner, swthAddress)
            console.log('Gas used:', result.receipt.gasUsed)

            const wallet = await Wallet.at(expectedAddress)
            await assertAsync(wallet.owner(), owner)
            await assertAsync(wallet.swthAddress(), swthAddress)
        })
    })
})
