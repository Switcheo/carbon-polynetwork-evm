const Vault = artifacts.require('Vault')
const Council = artifacts.require('Council')

module.exports = function(deployer) {
    deployer.then(async () => {
        const vault = await Vault.deployed()
        await deployer.deploy(Council, vault.address)
    })
}
