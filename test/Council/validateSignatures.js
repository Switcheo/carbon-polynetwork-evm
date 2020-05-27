const { web3, getCouncil, getUpdateVotingPowersParams, getSignatureParams,
        assertReversion } = require('../utils')

contract('Test validateSignatures', async (accounts) => {
    let council
    const deployer = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]
    const message = web3.utils.soliditySha3(
        { type: 'string', value: 'example message' }
    )

    beforeEach(async () => {
        council = await getCouncil()
        const params = await getUpdateVotingPowersParams({
            voters: [user1, user2, deployer],
            powers: [250, 50, 0],
            totalPower: 300,
            nonce: 1,
            signers: [deployer]
        })
        await council.updateVotingPowers(...params)
    })

    contract('when parameters are valid', async () => {
        it('does not throw an error', async () => {
            const params = await getSignatureParams({
                message,
                signers: [user1, user2]
            })

            await council.validateSignatures(...params)
        })
    })

    contract('when signers are empty', async () => {
        it('throws an error', async () => {
            const params = await getSignatureParams({
                message,
                signers: []
            })

            await assertReversion(
                council.validateSignatures(...params),
                'Signers cannot be empty'
            )
        })
    })

    contract('when _v.length != _signers.length', async () => {
        it('throws an error', async () => {
            const params = await getSignatureParams({
                message,
                signers: [user1, user2]
            })

            await assertReversion(
                council.validateSignatures(
                    params[0],
                    params[1],
                    params[2].slice(0, 1),
                    params[3],
                    params[4]
                ),
                'Invalid input lengths'
            )
        })
    })

    contract('when _r.length != _signers.length', async () => {
        it('throws an error', async () => {
            const params = await getSignatureParams({
                message,
                signers: [user1, user2]
            })

            await assertReversion(
                council.validateSignatures(
                    params[0],
                    params[1],
                    params[2],
                    params[3].slice(0, 1),
                    params[4]
                ),
                'Invalid input lengths'
            )
        })
    })

    contract('when _s.length != _signers.length', async () => {
        it('throws an error', async () => {
            const params = await getSignatureParams({
                message,
                signers: [user1, user2]
            })

            await assertReversion(
                council.validateSignatures(
                    params[0],
                    params[1],
                    params[2],
                    params[3],
                    params[4].slice(0, 1)
                ),
                'Invalid input lengths'
            )
        })
    })

    contract('when signers are not sorted in an strictly ascending order', async () => {
        it('throws an error', async () => {
            const params = await getSignatureParams({
                message,
                signers: [user1, user2]
            })

            await assertReversion(
                council.validateSignatures(
                    params[0],
                    params[1].reverse(),
                    params[2].reverse(),
                    params[3].reverse(),
                    params[4].reverse()
                ),
                'Invalid signers arragement'
            )
        })
    })

    contract('when signers are duplicated', async () => {
        it('throws an error', async () => {
            const params = await getSignatureParams({
                message,
                signers: [user1, user1]
            })

            await assertReversion(
                council.validateSignatures(
                    params[0],
                    params[1],
                    params[2],
                    params[3],
                    params[4]
                ),
                'Invalid signers arragement'
            )
        })
    })

    contract('when the signature is not valid', async () => {
        it('throws an error', async () => {
            const params = await getSignatureParams({
                message,
                signers: [user1, user2]
            })

            await assertReversion(
                council.validateSignatures(
                    params[0].replace('1', '2'),
                    params[1],
                    params[2],
                    params[3],
                    params[4]
                ),
                'Invalid signature'
            )
        })
    })

    contract('when the signers have insufficient voting power', async () => {
        it('throws an error', async () => {
            const params = await getSignatureParams({
                message,
                signers: [user2]
            })

            await assertReversion(
                council.validateSignatures(
                    params[0],
                    params[1],
                    params[2],
                    params[3],
                    params[4]
                ),
                'Insufficent voting power'
            )
        })
    })
})
