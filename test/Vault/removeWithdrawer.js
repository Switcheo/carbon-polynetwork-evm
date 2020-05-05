const { getVault, assertAsync, assertReversion } = require('../utils')

contract('Test removeWithdrawer', async (accounts) => {
    let vault
    const deployer = accounts[0]
    const user1 = accounts[1]

    beforeEach(async () => {
        vault = await getVault()
    })

    contract('when parameters are valid', async () => {
        it('removes a withdrawer', async () => {
            await assertAsync(vault.withdrawers(deployer), true)
            await vault.removeWithdrawer({ from: deployer })
            await assertAsync(vault.withdrawers(deployer), false)
        })
    })

    contract('when msg.sender is not a withdrawer', async () => {
        it('throws an error', async () => {
            await assertReversion(
                vault.removeWithdrawer({ from: user1 }),
                'Withdrawer already removed'
            )
        })
    })
})
