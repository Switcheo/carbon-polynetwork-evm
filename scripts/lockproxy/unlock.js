require("dotenv").config();

const truffleConfig = require("../../truffle-config.js");
const tokenBuildInfo = require("../../build/contracts/CarbonTokenArbi.json");
const ccmBuildInfo = require("../../build/contracts/CCMMock.json");
const lockProxyBuildInfo = require("../../build/contracts/LockProxy.json");
const { getContractFromBuild, loadTruffleNetwork, getProviderFromNetwork } = require("../utils.js");

const networkConfig = loadTruffleNetwork(truffleConfig);
const { wallet, provider } = getProviderFromNetwork(networkConfig);

(async () => {
  const tokenContract = getContractFromBuild(tokenBuildInfo, provider, networkConfig.network_id);
  const lockProxyContract = getContractFromBuild(lockProxyBuildInfo, provider, networkConfig.network_id);
  const ccmContract = getContractFromBuild(ccmBuildInfo, provider, networkConfig.network_id);

  const decimals = await tokenContract.decimals();

  const result = await ccmContract.connect(wallet).unlock(
    lockProxyContract.address,
    wallet.address,
    tokenContract.address,
    tokenContract.address,
    wallet.address,
    "1" + "0".repeat(decimals),
    5,
  );
  console.log(result)
})().catch(console.error).finally(() => process.exit(0));
