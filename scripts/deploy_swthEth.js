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

  const network = hre.network.name

  let lockProxyAddress
  if (network === 'goerli') {
    lockProxyAddress = '0xa06569e48fed18ed840c3f064ffd9bbf95debce7'
  } else {
    throw new Error(`unable to set lockProxyAddress for ${network}`)
  }

  // We get the contract to deploy
  const SWTHTokenEth = await hre.ethers.getContractFactory('SwitcheoToken')
  const swthTokenEth = await SWTHTokenEth.deploy(lockProxyAddress)

  await swthTokenEth.deployed()

  console.log('SWTHTokenBSCV2 deployed to:', swthTokenEth.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
