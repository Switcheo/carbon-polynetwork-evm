// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat')

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile')

  const counterpartChainId = 217
  const ccmProxyAddress = '0x26F5Ab48659f54E6231534E58ea0cb8c68e4ae29'

  const SwitcheoToken = await hre.ethers.getContractFactory('SwitcheoTokenBSC')
  const switcheoToken = await SwitcheoToken.deploy()

  await switcheoToken.deployed()

  // We get the contract to deploy
  const LockProxy = await hre.ethers.getContractFactory('LockProxy')
  const lockProxy = await LockProxy.deploy(switcheoToken.address, ccmProxyAddress, counterpartChainId)

  await lockProxy.deployed()

  console.log('SwitcheoToken deployed to:', switcheoToken.address)
  console.log('LockProxy deployed to:', lockProxy.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
