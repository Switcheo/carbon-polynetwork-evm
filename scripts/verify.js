const hre = require('hardhat')
const Web3 = require('web3')
hre.web3 = new Web3(hre.network.provider)


async function main() {
  // update chainid/addresses!!!
  const counterpartChainId = 219
  const swthAddress = '0xb823F200b918961Ca498DC60cdfaa3A665c26135'
  const ccmProxyAddress = '0xD39aFa1d7D7E2420F034C384AE7aCC4DB2F496d1'
  const lockProxyAddress = '0x7F7317167e90afa38972e46b031Bb4da0B1f6f73'
  const bridgeEntranceAddress = '0xd942Ba20A58543878335108aAC8C811F1f92fa33'

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

  // try {
  //   // tries to verify ccmnowhitelist
  //   await hre.run('verify:verify', {
  //     address: bridgeEntrance.address,
  //     constructorArguments: [
  //       lockProxyAddress,
  //     ],
  //   })
  // } catch (err) {
  //   console.log(err)
  // }

  console.log('done')

}


main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
