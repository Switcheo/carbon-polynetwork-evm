const SwitcheoToken = artifacts.require('SwitcheoToken')

module.exports = function(deployer) {
  deployer.then(async () => {
    await deployer.deploy(SwitcheoToken, process.env.lockProxyAddress).then(async (contract) => {
      console.log(contract.address)
    })
  })
}
