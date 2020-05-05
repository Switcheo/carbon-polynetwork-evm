const { getVault, assertAsync, assertReversion } = require('../utils')

contract('Test addWithdrawer', async (accounts) => {
    let vault
    const deployer = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]

    beforeEach(async () => {
        vault = await getVault()
    })

    contract('when parameters are valid', async () => {
        it('adds a withdrawer', async () => {
            await assertAsync(vault.withdrawers(user1), false)
            await vault.addWithdrawer(user1, { from: deployer })
            await assertAsync(vault.withdrawers(user1), true)
        })
    })

    contract('when msg.sender is not a withdrawer', async () => {
        it('throws an error', async () => {
            await assertReversion(
                vault.addWithdrawer(user1, { from: user2 }),
                'Unauthorised sender'
            )
            await assertAsync(vault.withdrawers(user1), false)
        })
    })
})
