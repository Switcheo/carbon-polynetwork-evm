const Wallet = artifacts.require('Wallet')
const { getWalletFactory, getVault, assertAsync, assertReversion, assertBalance } = require('../utils')
const { ETHER_ADDR } = require('../constants')

contract('Test createWalletAndSendEth', async (accounts) => {
    const user = accounts[0]
    let factory, vault

    beforeEach(async () => {
        vault = await getVault()
        factory = await getWalletFactory()
    })

    contract('when parameters are valid', async () => {
        it('creates a wallet at the expected address', async () => {
            const nativeAddress = '0x359EF15fB3E86dDF050228f03336979fA5212480'
            const externalAddress = 'swth1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'
            const vaultAddress = vault.address

            const expectedAddress = await factory.createWallet.call(nativeAddress, externalAddress, vaultAddress)
            const amount = web3.utils.toWei('1', 'ether')
            await web3.eth.sendTransaction({ from: user, to: expectedAddress, value: amount })

            await assertBalance(vault.address, ETHER_ADDR, '0')
            await assertBalance(expectedAddress, ETHER_ADDR, amount)

            await assertReversion(Wallet.at(expectedAddress), 'Cannot create instance of Wallet; no code at address')

            const result = await factory.createWalletAndSendEth(nativeAddress, externalAddress, vaultAddress)
            console.log('Gas used:', result.receipt.gasUsed)

            await assertBalance(vault.address, ETHER_ADDR, amount)
            await assertBalance(expectedAddress, ETHER_ADDR, '0')

            const wallet = await Wallet.at(expectedAddress)
            await assertAsync(wallet.nativeAddress(), nativeAddress)
            await assertAsync(wallet.externalAddress(), externalAddress)
            await assertAsync(wallet.vaultAddress(), vaultAddress)
        })
    })
})
