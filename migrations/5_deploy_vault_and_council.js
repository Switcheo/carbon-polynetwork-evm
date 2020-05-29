const Vault = artifacts.require('Vault')
const Council = artifacts.require('Council')

module.exports = function(deployer) {
    deployer.then(async () => {
        const vault = await deployer.deploy(Vault)
        const council = await deployer.deploy(Council, vault.address)
        await vault.addWithdrawer(council.address, 1)
    })
}
