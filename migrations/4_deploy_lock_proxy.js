const LockProxy = artifacts.require('LockProxy')

module.exports = function(deployer) {
    const ccmProxyAddress = '0x838bf9e95cb12dd76a54c9f9d2e3082eaf928270'
    const counterpartChainId = 173
    deployer.deploy(LockProxy, ccmProxyAddress, counterpartChainId)
}
