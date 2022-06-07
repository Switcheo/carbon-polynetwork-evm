const SwitcheoToken = artifacts.require('SwitcheoTokenHeco')

module.exports = function(deployer) {
  deployer.then(async () => {
    await deployer.deploy(SwitcheoToken).then(async (contract) => {
      console.log(contract.address)
      await contract.delegateToBridge(process.env.BRIDGE_ADDRESS)
    })
  })
}
