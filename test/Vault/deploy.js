const { getVault, assertAsync } = require('../utils')

contract('Test deploy', async (accounts) => {
    let vault
    const deployer = accounts[0]

    beforeEach(async () => {
        vault = await getVault()
    })

    it('sets the deployer as a withdrawer', async () => {
        await assertAsync(vault.withdrawers(deployer), true)
    })
})
