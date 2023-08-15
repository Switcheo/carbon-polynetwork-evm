/* eslint-disable max-len */
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

  let fluoDepositerAddress
  const USDC_ASSET_HASH = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'

  if (network === 'arbitrum') {
    fluoDepositerAddress = '0x68929d51889fc50d8fe8286b6AaEABDCe90B5F6f'
  } else {
    throw new Error(`unable to set FLUODepositer for ${network}`)
  }

  // We get the contract to deploy
  const FLUODepositer = await hre.ethers.getContractFactory('FLUODepositer')
  const fluoDepositer = FLUODepositer.attach(fluoDepositerAddress)

  const USDC = await hre.ethers.getContractFactory('contracts/libs/token/ERC20/ERC20.sol:ERC20')
  const usdc = USDC.attach(USDC_ASSET_HASH)

  const aaa = await usdc.approve(fluoDepositerAddress, '99999999999999999999')
  await aaa.wait(1)

  const res = await fluoDepositer.lock(USDC_ASSET_HASH,
    [
      '0xc039489853d59eba32a7451c4691432842667a57',
      '0xad9be45fd11544899d0efb2d0cb774bd93c114fe',
      '0x757364632e312e31392e663961666533',
      '0xc039489853d59eba32a7451c4691432842667a57',
      '0x2ad2e5ba685ad81a6fd517f8b025112c2019eb8cedb27935b0e7f1afe442fd107963c2dc454f50529f787cc25fe4a0d9e0aa61b585fa79b0321d4916a40d37a7',
      '0xf9528a73ad985242580ff835aeeb639008e32b3ff2ca588df45809efd4aa74a37ca6f56529ff3ba2a98c1d393ce663baedaba3f9453e35924e711277faeb8be01c',
      '0x94D1A788cFEDcEDc7591F2A023fAee186c6F332c',
      '0xef0B6eDC8Fcac565fAa32f81cd4E424aCFF3ae94',
    ],
    [
      100000, 0, 100000, 2, 1,
    ], false)
  await res.wait(1)
  console.log(res)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
