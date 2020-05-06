const { getVault, assertBalance, assertEvents, assertAsync, assertReversion } = require('../utils')
const { ETHER_ADDR } = require('../constants')

contract('Test deposit', async (accounts) => {
    let vault
    const user = accounts[1]
    const externalAddress = 'swth1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'
    const senderAddress = 'sender1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'

    beforeEach(async () => {
        vault = await getVault()
    })

    contract('test event emission', async () => {
        it('emits events', async () => {
            const amount = web3.utils.toWei('1', 'ether')
            const result = await vault.deposit(
                user,
                externalAddress,
                senderAddress,
                { from: user, value: amount }
            )

            assertEvents(result, [
                'Deposit',
                {
                    user,
                    assetId: ETHER_ADDR,
                    amount,
                    externalAddress,
                    sender: senderAddress
                }
            ])
        })
    })

    contract('when parameters are valid', async () => {
        it('deposits ETH', async () => {
            const amount = web3.utils.toWei('1', 'ether')
            await vault.deposit(
                user,
                externalAddress,
                senderAddress,
                { from: user, value: amount }
            )
            await assertBalance(vault.address, ETHER_ADDR, amount)
        })
    })

    contract('when parameters are valid', async () => {
        it('stores a pending deposit', async () => {
            const nonce = 0
            const amount = web3.utils.toWei('1', 'ether')
            const message = web3.utils.soliditySha3(
                { type: 'string', value: 'pendingDeposit' },
                { type: 'address', value: vault.address },
                { type: 'address', value: user },
                { type: 'address', value: ETHER_ADDR },
                { type: 'uint256', value: amount },
                { type: 'uint256', value: nonce }
            )
            await assertAsync(vault.pendingDeposits(message), false)

            await vault.deposit(
                user,
                externalAddress,
                senderAddress,
                { from: user, value: amount }
            )

            await assertAsync(vault.pendingDeposits(message), true)
        })
    })

    contract('when amount is 0', async () => {
        it('it throws an error', async () => {
            const amount = '0'
            await assertReversion(
                vault.deposit(
                    user,
                    externalAddress,
                    senderAddress,
                    { from: user, value: amount }
                ),
                'Deposit amount cannot be zero'
            )
        })
    })
})
