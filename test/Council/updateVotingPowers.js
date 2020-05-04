const { getCouncil, signMessage, assertAsync } = require('../utils')

contract('Test updateVotingPowers', async (accounts) => {
    let council
    const deployer = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]

    beforeEach(async () => {
        council = await getCouncil()
    })

    contract('when parameters are valid', async () => {
        it('updates voting powers', async () => {
            const voters = [user1, user2, deployer]
            const powers = [250, 50, 0]
            const totalPower = 300
            const nonce = 1
            const signers = [deployer]

            const message = web3.utils.soliditySha3(
                { type: 'string', value: 'updateVotingPowers' },
                { type: 'address[]', value: voters },
                { type: 'uint256[]', value: powers },
                { type: 'uint256', value: totalPower },
                { type: 'uint256', value: nonce }
            )

            const signature = await signMessage(message, deployer)

            await council.updateVotingPowers(
                voters,
                powers,
                totalPower,
                nonce,
                signers,
                [signature.v],
                [signature.r],
                [signature.s]
            )

            await assertAsync(council.votingPowers(deployer), '0')
            await assertAsync(council.votingPowers(user1), '250')
            await assertAsync(council.votingPowers(user2), '50')
        })
    })
})
