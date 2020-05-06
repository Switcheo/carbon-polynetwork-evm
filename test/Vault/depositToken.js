const { getVault, getJrc, assertBalance, assertEvents, assertAsync, assertReversion } = require('../utils')

contract('Test depositToken', async (accounts) => {
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
        it('deposits tokens', async () => {
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
        })
    })

    contract('when parameters are valid', async () => {
        it('stores a pending deposit', async () => {
            const amount = 20
            await jrc.approve(vault.address, amount, { from: user })
            const nonce = 0
            const message = web3.utils.soliditySha3(
                { type: 'string', value: 'pendingDeposit' },
                { type: 'address', value: vault.address },
                { type: 'address', value: user },
                { type: 'address', value: jrc.address },
                { type: 'uint256', value: amount },
                { type: 'uint256', value: nonce }
            )
            await assertAsync(vault.pendingDeposits(message), false)

            await vault.depositToken(
                user,
                jrc.address,
                amount,
                externalAddress,
                senderAddress,
                { from: user }
            )

            await assertAsync(vault.pendingDeposits(message), true)
        })
    })

    contract('when amount is 0', async () => {
        it('it throws an error', async () => {
            const amount = 20
            await jrc.approve(vault.address, amount, { from: user })
            await assertReversion(
                vault.depositToken(
                    user,
                    jrc.address,
                    0,
                    externalAddress,
                    senderAddress,
                    { from: user }
                ),
                'Deposit amount cannot be zero'
            )
        })
    })
})
