// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat')
const owners = require("./carbonarb/pre-kyber-exploit-carbon-arb-owners.json")
const balances = require("./carbonarb/pre-kyber-exploit-carbon-arb-balances.json")


async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile')

  // We get the contract to deploy
  const carbonArbV2 = await hre.ethers.getContractFactory('CarbonTokenArbiV2')
  const carbonArbV2Contract = await carbonArbV2.deploy(
    '0xb1E6F8820826491FCc5519f84fF4E2bdBb6e3Cad', // lockproxy address
    owners, // token owners
    balances // balances
  )

  await carbonArbV2Contract.deployed()

  console.log('carbonArbV2 deployed to:', carbonArbV2Contract.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
