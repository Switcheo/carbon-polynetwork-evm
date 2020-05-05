const { getVault, getCouncil, getUpdateVotingPowersParams, getRemoveWithdrawerParams,
        assertAsync, assertReversion } = require('../utils')

contract('Test removeWithdrawer', async (accounts) => {
    let council, vault
    const deployer = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]

    beforeEach(async () => {
        vault = await getVault()
        council = await getCouncil()
        const params = await getUpdateVotingPowersParams({
            voters: [user1, user2, deployer],
            powers: [250, 50, 0],
            totalPower: 300,
            nonce: 1,
            signers: [deployer]
        })
        await council.updateVotingPowers(...params)
        await vault.addWithdrawer(council.address, 100, { from: deployer })
        await vault.removeWithdrawer({ from: deployer })
    })

    contract('when parameters are valid', async () => {
        it('removes withdrawer access', async () => {
            await assertAsync(vault.withdrawers(council.address), true)
            const params = await getRemoveWithdrawerParams({
                signers: [user1, user2]
            })

            await council.removeWithdrawer(...params)
            await assertAsync(vault.withdrawers(council.address), false)
        })
    })

    contract('when there is insufficient voting power', async () => {
        it('throws an error', async () => {
            await assertAsync(vault.withdrawers(council.address), true)
            const params = await getRemoveWithdrawerParams({
                signers: [user2]
            })

            await assertReversion(
                council.removeWithdrawer(...params),
                'Insufficent voting power'
            )
            await assertAsync(vault.withdrawers(council.address), true)
        })
    })
})
