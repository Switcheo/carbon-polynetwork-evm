const { getVault, getCouncil, getUpdateVotingPowersParams, getAddWithdrawerParams,
        assertAsync } = require('../utils')

contract('Test validateSignatures', async (accounts) => {
    let council, vault
    const deployer = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]
    const user3 = accounts[3]

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
        it('adds a withdrawer to the vault contract', async () => {
            await assertAsync(vault.withdrawers(user3), false)
            const params = await getAddWithdrawerParams({
                withdrawer: user3,
                nonce: 1,
                signers: [user1, user2]
            })

            await council.addWithdrawer(...params)
            await assertAsync(vault.withdrawers(user3), true)
        })
    })
})
