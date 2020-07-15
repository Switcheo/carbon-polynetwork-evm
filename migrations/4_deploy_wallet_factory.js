const WalletFactory = artifacts.require('WalletFactory')

module.exports = function(deployer) {
    const targetChainId = 173
    const lockProxyAddress = '0x8eb220f0d4dcd610a5208753366557270e899bf2'
    deployer.deploy(WalletFactory, targetChainId, lockProxyAddress)
}
