const SwitcheoTokenModifiable = artifacts.require('SwitcheoTokenModifiable')

module.exports = function(deployer) {
  deployer.then(async () => {
    await deployer.deploy(SwitcheoTokenModifiable).then(async (contract) => {
      console.log(contract.address)
      await contract.delegateToBridge(process.env.BRIDGE_ADDRESS)
    })
  })
}
