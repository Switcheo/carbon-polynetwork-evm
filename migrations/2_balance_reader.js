const BalanceReader = artifacts.require('BalanceReader')

module.exports = function(deployer) {
    deployer.deploy(BalanceReader)
}
