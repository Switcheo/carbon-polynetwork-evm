const Vault = artifacts.require('Vault')

module.exports = function(deployer) {
    deployer.deploy(Vault)
}
