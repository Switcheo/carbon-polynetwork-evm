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

  if (network === 'arbitrum') {
    lockProxyAddress = '0xb1E6F8820826491FCc5519f84fF4E2bdBb6e3Cad'
  } else {
    throw new Error(`unable to set lockProxyAddress for ${network}`)
  }

  // We get the contract to deploy
  const FLUODepositer = await hre.ethers.getContractFactory('FLUODepositer')
  const fluoDepositer = await FLUODepositer.deploy(lockProxyAddress, '0xaf88d065e77c8cC2239327C5EDb3A432268e5831')
  console.log('Deploying FLUODepositer: ', fluoDepositer.address)
  await fluoDepositer.deployed()

  console.log('FLUODepositer deployed to:', fluoDepositer.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
