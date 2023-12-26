require('dotenv').config()

const truffleConfig = require('../../truffle-config.js')
const tokenBuildInfo = require('../../build/contracts/CarbonTokenArbi.json')
const lockProxyBuildInfo = require('../../build/contracts/LockProxy.json')
const { getContractFromBuild, loadTruffleNetwork, getProviderFromNetwork } = require('../utils.js')
const { ethers } = require('ethers')

const networkConfig = loadTruffleNetwork(truffleConfig)
const { wallet, provider } = getProviderFromNetwork(networkConfig);

(async () => {
  const tokenContract = getContractFromBuild(tokenBuildInfo, provider, networkConfig.network_id)
  const lockProxyContract = getContractFromBuild(lockProxyBuildInfo, provider, networkConfig.network_id)

  const decimals = await tokenContract.decimals()
  const allowance = await tokenContract.allowance(wallet.address, lockProxyContract.address)

  if (allowance.isZero()) {
    await tokenContract.connect(wallet).approve(lockProxyContract.address, ethers.BigNumber.from(2).pow(256).add(-1))
  }

  const lockAmount = ethers.BigNumber.from('1' + '0'.repeat(decimals))
  const result = await lockProxyContract.connect(wallet).lock(
    tokenContract.address,
    wallet.address,
    wallet.address,
    tokenContract.address,
    ethers.constants.AddressZero,
    [
      lockAmount,
      ethers.constants.Zero,
      lockAmount,
    ]
  )
  console.log(result)
})().catch(console.error).finally(() => process.exit(0))
