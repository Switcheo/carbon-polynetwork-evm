const CCMMock = artifacts.require('CCMMock')
const CCMProxyMock = artifacts.require('CCMProxyMock')
const LockProxy = artifacts.require('LockProxy')
const SwitcheoToken = artifacts.require('SwitcheoToken')
const { LOCAL_COUNTERPART_CHAIN_ID } = require('../test/constants')

module.exports = function(deployer, network) {
    deployer.then(async () => {
        // let counterpartChainId = 192
        // let ccmProxyAddress = '0x7087E66D6874899A331b926C261fa5059328d95F'
        let counterpartChainId = 195
        let ccmProxyAddress = '0x441C035446c947a97bD36b425B67907244576990'

        if (network === 'development') {
            await deployer.deploy(CCMMock)
            const ccm = await CCMMock.deployed()
            await deployer.deploy(CCMProxyMock, ccm.address)
            const ccmProxy = await CCMProxyMock.deployed()
            ccmProxyAddress = ccmProxy.address
            counterpartChainId = LOCAL_COUNTERPART_CHAIN_ID
        }

        //  deploy SwitcheoToken
        await deployer.deploy(SwitcheoToken)
        const swithcheoTokenAddress = SwitcheoToken.address
        const swithcheoTokenInstance = await SwitcheoToken.deployed()

        //  deploy LockProxy
        await deployer.deploy(LockProxy, swithcheoTokenAddress, ccmProxyAddress, counterpartChainId)
        const lockProxyAddress = LockProxy.address

        // initialise LockProxy address for SwitcheoToken
        await swithcheoTokenInstance.initalize(lockProxyAddress)
    })
}
