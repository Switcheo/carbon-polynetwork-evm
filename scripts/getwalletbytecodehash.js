// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat')
const Web3 = require('web3')
const web3 = new Web3(Web3.givenProvider)

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile')

  console.log('getwalletbytecodehash')
  const Wallet = await hre.ethers.getContractFactory('Wallet')

  const encodedParams = web3.eth.abi.encodeParameters([], []).slice(2)
  const constructorByteCode = `${Wallet.bytecode}${encodedParams}`
  const walletBytecodeHash = web3.utils.keccak256(constructorByteCode)
  console.log(walletBytecodeHash)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
