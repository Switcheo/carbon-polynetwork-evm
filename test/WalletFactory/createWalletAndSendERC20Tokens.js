const Wallet = artifacts.require('Wallet')
const { getJrc, getWalletFactory, getVault, assertAsync, assertReversion, assertBalance } = require('../utils')

contract('Test createWalletAndSendERC20Tokens', async (accounts) => {
    const user = accounts[0]
    const senderAddress = 'swthval'
    let factory, vault, jrc

    beforeEach(async () => {
        vault = await getVault()
        factory = await getWalletFactory()
        jrc = await getJrc()

        await jrc.mint(user, 42)
    })

    contract('when parameters are valid', async () => {
        it('creates a wallet at the expected address', async () => {
            const nativeAddress = '0x359EF15fB3E86dDF050228f03336979fA5212480'
            const externalAddress = 'swth1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'
            const vaultAddress = vault.address

            const expectedAddress = await factory.createWallet.call(nativeAddress, externalAddress, vaultAddress)
            await jrc.transfer(expectedAddress, '42', { from: user })

            await assertBalance(expectedAddress, jrc, '42')
            await assertBalance(vault.address, jrc, '0')

            await assertReversion(Wallet.at(expectedAddress), 'Cannot create instance of Wallet; no code at address')

            const result = await factory.createWalletAndSendERC20Tokens(
                nativeAddress,
                externalAddress,
                vaultAddress,
                jrc.address,
                '42',
                '100',
                senderAddress
            )
            console.log('Gas used:', result.receipt.gasUsed)

            await assertBalance(expectedAddress, jrc, '0')
            await assertBalance(vault.address, jrc, '42')

            const wallet = await Wallet.at(expectedAddress)
            await assertAsync(wallet.nativeAddress(), nativeAddress)
            await assertAsync(wallet.externalAddress(), externalAddress)
            await assertAsync(wallet.vaultAddress(), vaultAddress)
        })
    })
})
