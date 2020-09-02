const LockProxy = artifacts.require('LockProxy')

module.exports = function(deployer) {
    const targetChainId = 173
    const ccmProxyAddress = '0x838bf9e95cb12dd76a54c9f9d2e3082eaf928270'
    deployer.deploy(LockProxy, ccmProxyAddress, targetChainId)
}
