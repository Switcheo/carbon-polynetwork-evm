const CCMMock = artifacts.require('CCMMock')
const CCMProxyMock = artifacts.require('CCMProxyMock')
const LockProxy = artifacts.require('LockProxy')
const { LOCAL_COUNTERPART_CHAIN_ID } = require('../test/constants')

module.exports = function(deployer, network) {
    deployer.then(async () => {
        let counterpartChainId = 198
        let ccmProxyAddress = '0xb600c8a2e8852832B75DB9Da1A3A1c173eAb28d8'

        if (network === 'development') {
            await deployer.deploy(CCMMock)
            const ccm = await CCMMock.deployed()
            await deployer.deploy(CCMProxyMock, ccm.address)
            const ccmProxy = await CCMProxyMock.deployed()
            ccmProxyAddress = ccmProxy.address
            counterpartChainId = LOCAL_COUNTERPART_CHAIN_ID
        }

        await deployer.deploy(LockProxy, ccmProxyAddress, counterpartChainId)
    })
}
