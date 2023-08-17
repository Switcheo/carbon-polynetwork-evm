const hre = require('hardhat')
const Web3 = require('web3')
hre.web3 = new Web3(hre.network.provider)


async function main() {
  // update addresses!!!
  const lockProxyAddress = '0xb1E6F8820826491FCc5519f84fF4E2bdBb6e3Cad'

  const FLUODepositer = await hre.ethers.getContractFactory('FLUODepositer')
  const fluoDepositer = FLUODepositer.attach('0x68929d51889fc50d8fe8286b6AaEABDCe90B5F6f')

  console.log('verifying!')

  try {
    // tries to verify ccmnowhitelist
    await hre.run('verify:verify', {
      address: fluoDepositer.address,
      constructorArguments: [
        lockProxyAddress,
        '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      ],
    })
  } catch (err) {
    console.log(err)
  }

  console.log('done')
}


main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
