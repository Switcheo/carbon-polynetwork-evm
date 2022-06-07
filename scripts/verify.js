const hre = require('hardhat')
const Web3 = require('web3')
hre.web3 = new Web3(hre.network.provider)


async function main() {
  const counterpartChainId = 216
  // update addresses!!!
  const ccmProxyAddress = '0x2e3b36411abEE54Ee16999156336eF920c46C38a'
  const lockProxyAddress = '0xD0EB96dC8B984452a40F701e650Fc5011D4236dd'
  const bridgeEntranceAddress = '0x22bf293E7CB485662CcA0cd05044F4B59c2b14e6'

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
