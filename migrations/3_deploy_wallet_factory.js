const WalletFactory = artifacts.require('WalletFactory')

module.exports = function(deployer) {
    deployer.deploy(WalletFactory)
}
