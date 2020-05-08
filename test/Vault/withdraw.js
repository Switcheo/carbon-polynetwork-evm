const { getVault, getJrc, assertBalance, assertReversion } = require('../utils')
const { ETHER_ADDR } = require('../constants')

contract('Test withdraw', async (accounts) => {
    let vault, jrc
    const user = accounts[1]
    const externalAddress = 'swth1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'
    const senderAddress = 'sender1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'

    beforeEach(async () => {
        vault = await getVault()
        jrc = await getJrc()
        await jrc.mint(user, 42)
    })

    contract('when parameters are valid', async () => {
        it('withdraws ETH', async () => {
            const receiver = web3.eth.accounts.create().address
            await assertBalance(receiver, ETHER_ADDR, 0)

            const amount = web3.utils.toWei('1', 'ether')
            await vault.deposit(
                user,
                externalAddress,
                senderAddress,
                { from: user, value: amount }
            )
            await assertBalance(vault.address, ETHER_ADDR, amount)

            const withdrawalAmount = web3.utils.toWei('0.7', 'ether')
            await vault.withdraw(
                receiver,
                ETHER_ADDR,
                withdrawalAmount
            )

            await assertBalance(receiver, ETHER_ADDR, withdrawalAmount)
            await assertBalance(vault.address, ETHER_ADDR, web3.utils.toWei('0.3', 'ether'))
        })
    })

    contract('when parameters are valid', async () => {
        it('withdraws tokens', async () => {
            const receiver = web3.eth.accounts.create().address
            await assertBalance(receiver, jrc, 0)

            const amount = 20
            await jrc.approve(vault.address, amount, { from: user })
            await vault.depositToken(
                user,
                jrc.address,
                amount,
                externalAddress,
                senderAddress,
                { from: user }
            )
            await assertBalance(vault.address, jrc, amount)

            const withdrawalAmount = 5
            await vault.withdraw(
                receiver,
                jrc.address,
                withdrawalAmount
            )

            await assertBalance(receiver, jrc, withdrawalAmount)
            await assertBalance(vault.address, jrc, 15)
        })
    })

    contract('when the sender is not an authorised withdrawer', async () => {
        it('throws an error', async () => {
            const receiver = web3.eth.accounts.create().address
            await assertBalance(receiver, ETHER_ADDR, 0)

            const amount = web3.utils.toWei('1', 'ether')
            await vault.deposit(
                user,
                externalAddress,
                senderAddress,
                { from: user, value: amount }
            )
            await assertBalance(vault.address, ETHER_ADDR, amount)
            const withdrawalAmount = web3.utils.toWei('0.7', 'ether')
            await assertReversion(
                vault.withdraw(
                    receiver,
                    ETHER_ADDR,
                    withdrawalAmount,
                    { from: receiver }
                ),
                'Unauthorised sender'
            )

            await assertBalance(receiver, ETHER_ADDR, 0)
            await assertBalance(vault.address, ETHER_ADDR, amount)
        })
    })
})
