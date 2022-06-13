const hre = require('hardhat')
const Web3 = require('web3')
hre.web3 = new Web3(hre.network.provider)


async function main() {
  const counterpartChainId = 216
  // update addresses!!!
  const swthAddress = '0x32e125258b7db0a0dffde5bd03b2b859253538ab'
  const ccmProxyAddress = '0x6564BAd8ab4967EA48bef7bF224801E92DBb6Be9'
  const lockProxyAddress = '0xFE5C9832b62bFfFFfD1B091de457254dab344C04'
  const bridgeEntranceAddress = '0x1fFf3678De3b2e250eccB214078902DcEe08748B'

  const LockProxy = await hre.ethers.getContractFactory('LockProxy')
  const lockProxy = await LockProxy.attach(lockProxyAddress)

  const BridgeEntrance = await hre.ethers.getContractFactory('BridgeEntrance')
  const bridgeEntrance = await BridgeEntrance.attach(bridgeEntranceAddress)

  console.log('verifying!')
  console.log(lockProxy.address)
  console.log(bridgeEntrance.address)

  try {
    // tries to verify ccmnowhitelist
    await hre.run('verify:verify', {
      address: lockProxy.address,
      constructorArguments: [
        swthAddress,
        ccmProxyAddress,
        counterpartChainId,
      ],
    })
  } catch (err) {
    console.log(err)
  }

  try {
    // tries to verify ccmnowhitelist
    await hre.run('verify:verify', {
      address: bridgeEntrance.address,
      constructorArguments: [
        lockProxyAddress,
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
