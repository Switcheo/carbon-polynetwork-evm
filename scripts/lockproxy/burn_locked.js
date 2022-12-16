require("dotenv").config();

const truffleConfig = require("../../truffle-config.js");
const tokenBuildInfo = require("../../build/contracts/CarbonTokenArbi.json");
const { getContractFromBuild, loadTruffleNetwork, getProviderFromNetwork } = require("../utils.js");

const networkConfig = loadTruffleNetwork(truffleConfig);
const { wallet, provider } = getProviderFromNetwork(networkConfig);

(async () => {
  const tokenContract = getContractFromBuild(tokenBuildInfo, provider, networkConfig.network_id);
  const result = await tokenContract.connect(wallet).burnLockedTokens();
  console.log(result)
})().catch(console.error).finally(() => process.exit(0));
