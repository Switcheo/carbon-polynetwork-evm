const { getVault, assertAsync, assertReversion } = require('../utils')
const { ETHER_ADDR } = require('../constants')

contract('Test deposit', async (accounts) => {
    let vault
    const user = accounts[1]
    const externalAddress = 'swth1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'
    const senderAddress = 'sender1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'

    beforeEach(async () => {
        vault = await getVault()
    })

    contract('when parameters are valid', async () => {
        it('clears pending deposits', async () => {
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

            await vault.clearPendingDeposits([message])
            await assertAsync(vault.pendingDeposits(message), false)
        })
    })

    contract('when the sender is not authorised', async () => {
        it('throws an error', async () => {
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

            await assertReversion(
                vault.clearPendingDeposits([message], { from: user }),
                'Unauthorised sender'
            )
            await assertAsync(vault.pendingDeposits(message), true)
        })
    })
})
