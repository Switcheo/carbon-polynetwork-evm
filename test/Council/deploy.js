const { getCouncil } = require('../utils')

contract('Test deploy', async (accounts) => {
    let council
    const deployer = accounts[0]

    beforeEach(async () => {
        council = await getCouncil()
    })

    it('sets totalVotingPower to 100', async () => {
        const totalVotingPower = await council.totalVotingPower()
        assert.equal(totalVotingPower.toString(), '100')
    })

    it('sets deployer\'s voting power to 100', async () => {
        const votingPower = await council.votingPowers(deployer)
        assert.equal(votingPower.toString(), '100')
    })
})
