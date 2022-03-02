const LockProxy = artifacts.require('LockProxy')
const SWTHTokenBSCV2 = artifacts.require('SWTHTokenBSCV2')

module.exports = function(deployer) {
  deployer.then(async () => {
    const lockProxy = await LockProxy.deployed()
    const lockProxyAddress = lockProxy.address
    const legacyAddress = '0x0000000000000000000000000000000000000000'

    await deployer.deploy(SWTHTokenBSCV2, lockProxyAddress, legacyAddress)
  })
}
