const { getCouncil, signMessage, assertAsync, assertReversion, assertEvents,
        getUpdateVotingPowersParams } = require('../utils')

contract('Test updateVotingPowers', async (accounts) => {
    let council
    const deployer = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]

    beforeEach(async () => {
        council = await getCouncil()
    })

    contract('test event emission', async () => {
        it('emits events', async () => {
            const params = await getUpdateVotingPowersParams({
                voters: [user1, user2, deployer],
                powers: [250, 50, 0],
                totalPower: 300,
                nonce: 1,
                signers: [deployer]
            })

            const result = await council.updateVotingPowers(...params)
            assertEvents(result, [
                'VotingPowerIncrease',
                {
                    voter: user1,
                    amount: 250
                },
                'VotingPowerIncrease',
                {
                    voter: user2,
                    amount: 50
                },
                'VotingPowerDecrease',
                {
                    voter: deployer,
                    amount: 100
                }
            ])
        })
    })

    contract('test event emission', async () => {
        it('emits voting power changes', async () => {
            await council.updateVotingPowers(
                ...await getUpdateVotingPowersParams({
                    voters: [user1, user2, deployer],
                    powers: [250, 50, 0],
                    totalPower: 300,
                    nonce: 1,
                    signers: [deployer]
                })
            )

            const result = await council.updateVotingPowers(
                ...await getUpdateVotingPowersParams({
                    voters: [user1, user2],
                    powers: [210, 60],
                    totalPower: 270,
                    nonce: 2,
                    signers: [user1, user2]
                })
            )

            assertEvents(result, [
                'VotingPowerDecrease',
                {
                    voter: user1,
                    amount: 40
                },
                'VotingPowerIncrease',
                {
                    voter: user2,
                    amount: 10
                }
            ])
        })
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

    contract('when using getUpdateVotingPowersParams', async () => {
        it('updates voting powers', async () => {
            const params = await getUpdateVotingPowersParams({
                voters: [user1, user2, deployer],
                powers: [250, 50, 0],
                totalPower: 300,
                nonce: 1,
                signers: [deployer]
            })

            await council.updateVotingPowers(...params)

            await assertAsync(council.votingPowers(deployer), '0')
            await assertAsync(council.votingPowers(user1), '250')
            await assertAsync(council.votingPowers(user2), '50')
        })
    })

    contract('when voters are empty', async () => {
        it('throws an error', async () => {
            const params = await getUpdateVotingPowersParams({
                voters: [],
                powers: [250, 50, 0],
                totalPower: 300,
                nonce: 1,
                signers: [deployer]
            })

            await assertReversion(
                council.updateVotingPowers(...params),
                'Input cannot be empty'
            )
        })
    })

    contract('when voters length does not match powers length', async () => {
        it('throws an error', async () => {
            const params = await getUpdateVotingPowersParams({
                voters: [user1],
                powers: [250, 50, 0],
                totalPower: 300,
                nonce: 1,
                signers: [deployer]
            })

            await assertReversion(
                council.updateVotingPowers(...params),
                'Invalid input lengths'
            )
        })
    })

    contract('when the nonce has been used before', async () => {
        it('throws an error', async () => {
            const params = await getUpdateVotingPowersParams({
                voters: [deployer],
                powers: [100],
                totalPower: 100,
                nonce: 1,
                signers: [deployer]
            })

            await council.updateVotingPowers(...params)

            await assertReversion(
                council.updateVotingPowers(...params),
                'Nonce has already been used'
            )
        })
    })

    contract('when the signers have insufficient voting power', async () => {
        it('throws an error', async () => {
            await council.updateVotingPowers(
                ...await getUpdateVotingPowersParams({
                    voters: [user1, user2, deployer],
                    powers: [250, 50, 0],
                    totalPower: 300,
                    nonce: 1,
                    signers: [deployer]
                })
            )

            await council.updateVotingPowers(
                ...await getUpdateVotingPowersParams({
                    voters: [user1, user2],
                    powers: [250, 50],
                    totalPower: 300,
                    nonce: 2,
                    signers: [user1, user2]
                })
            )

            await assertReversion(
                council.updateVotingPowers(
                    ...await getUpdateVotingPowersParams({
                        voters: [user1, user2],
                        powers: [250, 50],
                        totalPower: 300,
                        nonce: 3,
                        signers: [user2]
                    })
                ),
                'Insufficent voting power'
            )
        })
    })
})
