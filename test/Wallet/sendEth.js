const Wallet = artifacts.require('Wallet')
const { web3, getVault, assertBalance } = require('../utils')
const { ETHER_ADDR } = require('../constants')

contract('Test sendETH', async (accounts) => {
    let vault, wallet
    const externalAddress = 'swth1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'

    beforeEach(async () => {
        vault = await getVault()
        wallet = await Wallet.new()
        await wallet.initialize(externalAddress, vault.address)
    })

    contract('when parameters are valid', async () => {
        it('sends ETH to the vault', async () => {
            const amount = web3.utils.toWei('1', 'ether')
            await wallet.send(amount)
            await assertBalance(vault.address, ETHER_ADDR, '0')
            await assertBalance(wallet.address, ETHER_ADDR, amount)

            await wallet.sendETH()
            await assertBalance(vault.address, ETHER_ADDR, amount)
            await assertBalance(wallet.address, ETHER_ADDR, '0')
        })
    })
})
