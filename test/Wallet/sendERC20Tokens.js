const Wallet = artifacts.require('Wallet')
const { getJrc, getVault, assertBalance, assertEqual } = require('../utils')

contract('Test sendERC20Tokens', async (accounts) => {
    let vault, wallet, jrc
    const user = accounts[0]
    const senderAddress = 'swthval'
    const externalAddress = 'swth1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'
    const nativeAddress = '0x359EF15fB3E86dDF050228f03336979fA5212480'

    beforeEach(async () => {
        vault = await getVault()
        wallet = await Wallet.new()
        jrc = await getJrc()

        await wallet.initialize(nativeAddress, externalAddress, vault.address)
        await jrc.mint(user, 42)
    })

    contract('when parameters are valid', async () => {
        it('sends ETH to the vault', async () => {
            await assertBalance(user, jrc, '42')
            await assertBalance(wallet.address, jrc, '0')
            await assertBalance(vault.address, jrc, '0')

            await jrc.transfer(wallet.address, '30', { from: user })
            await assertBalance(user, jrc, '12')
            await assertBalance(wallet.address, jrc, '30')
            await assertBalance(vault.address, jrc, '0')

            await wallet.sendERC20Tokens(jrc.address, '10', '100', senderAddress)
            await assertBalance(user, jrc, '12')
            await assertBalance(wallet.address, jrc, '20')
            await assertBalance(vault.address, jrc, '10')

            const allowance = await jrc.allowance(wallet.address, vault.address)
            assertEqual(allowance, '90')
        })
    })
})
