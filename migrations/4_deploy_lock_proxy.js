const CCMMock = artifacts.require('CCMMock')
const CCMProxyMock = artifacts.require('CCMProxyMock')
const LockProxy = artifacts.require('LockProxy')
const { LOCAL_COUNTERPART_CHAIN_ID } = require('../test/constants')

module.exports = function(deployer, network) {
    deployer.then(async () => {
        let counterpartChainId = 213
        let ccmProxyAddress = '0xb6cAd9baf43f780407F8e637Cd575a1c619f414c'

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
