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

  if (network === 'rinkeby') {
    lockProxyAddress = '0x7F7317167e90afa38972e46b031Bb4da0B1f6f73'
  } else if (network === 'bsc') {
    lockProxyAddress = '0xb5D4f343412dC8efb6ff599d790074D0f1e8D430'
  } else if (network === 'mainnet') {
    lockProxyAddress = '0x9a016ce184a22dbf6c17daa59eb7d3140dbd1c54'
  } else {
    throw new Error(`unable to set lockProxyAddress for ${network}`)
  }

  // We get the contract to deploy
  const BridgeEntrance = await hre.ethers.getContractFactory('BridgeEntrance')
  const bridgeEntrance = await BridgeEntrance.deploy(lockProxyAddress)

  await bridgeEntrance.deployed()

  console.log('BridgeEntrance deployed to:', bridgeEntrance.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
