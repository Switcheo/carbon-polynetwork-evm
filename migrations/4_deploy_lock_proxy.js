const CCMMock = artifacts.require('CCMMock')
const CCMProxyMock = artifacts.require('CCMProxyMock')
const LockProxy = artifacts.require('LockProxy')
const { LOCAL_COUNTERPART_CHAIN_ID } = require('../test/constants')

module.exports = function(deployer, network) {
    deployer.then(async () => {
        let counterpartChainId = 199
        let ccmProxyAddress = '0xE5525808853BED279B8a226367893C852B736A65'

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
