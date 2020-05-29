const { getBalanceReader, getJrc } = require('../utils')

contract('Test getBalances', async (accounts) => {
    let reader, jrc
    const user = accounts[1]

    beforeEach(async () => {
        jrc = await getJrc()
        reader = await getBalanceReader()
        await jrc.mint(user, 42)
    })

    it('gets balances', async () => {
        const balances = await reader.getBalances(user, [jrc.address])
        assert.equal(balances.length, 1)
        assert.equal(balances[0].toString(), '42')
    })
})
