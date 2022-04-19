const hre = require('hardhat')
const Web3 = require('web3')
hre.web3 = new Web3(hre.network.provider)


async function main() {
  const counterpartChainId = 214
  // update addresses!!!
  const ccmProxyAddress = '0xb6cAd9baf43f780407F8e637Cd575a1c619f414c'
  const lockProxyAddress = '0x26a12a0349EEa0816ccaA7FdaBA16BB8325dDEbD'
  const bridgeEntranceAddress = '0x9B3300A8126b3e4cC316B5280e5e6497538822bf'

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
