const CCMMock = artifacts.require('CCMMock')
const CCMProxyMock = artifacts.require('CCMProxyMock')
const LockProxy = artifacts.require('LockProxy')
const { LOCAL_COUNTERPART_CHAIN_ID } = require('../test/constants')

module.exports = function(deployer, network) {
    deployer.then(async () => {
        let counterpartChainId = 192
        let ccmProxyAddress = '0x7087E66D6874899A331b926C261fa5059328d95F'

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
