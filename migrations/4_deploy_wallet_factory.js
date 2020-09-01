const WalletFactory = artifacts.require('WalletFactory')

module.exports = function(deployer) {
    const targetChainId = 173
    deployer.deploy(WalletFactory, targetChainId)
}
