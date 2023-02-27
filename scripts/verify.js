const hre = require('hardhat')
const Web3 = require('web3')
hre.web3 = new Web3(hre.network.provider)


async function main() {
  const counterpartChainId = 5
  // update addresses!!!
  const ccmProxyAddress = '0x5366ea2b5b729ff3cef404c2408c8c60cc061b71'
  const lockProxyAddress = '0xF763fa322Dc58dEe588252fAFee5f448e863b633'
  const bridgeEntranceAddress = '0x192C14B22B651B1f85e98704D20A7E326369Fa54'

  const LockProxy = await hre.ethers.getContractFactory('LockProxy')
  const lockProxy = LockProxy.attach(lockProxyAddress)

  const BridgeEntrance = await hre.ethers.getContractFactory('BridgeEntrance')
  const bridgeEntrance = BridgeEntrance.attach(bridgeEntranceAddress)

  console.log('verifying!')
  console.log(lockProxy.address)
  console.log(bridgeEntrance.address)

  try {
    // tries to verify ccmnowhitelist
    await hre.run('verify:verify', {
      address: lockProxy.address,
      constructorArguments: [
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
