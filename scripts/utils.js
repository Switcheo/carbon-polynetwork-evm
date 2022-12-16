const { ethers } = require("ethers");

module.exports.getContractFromBuild = (buildInfo, provider, chainId) => {
  const deployInfo = buildInfo?.networks?.[chainId];
  if (!deployInfo?.address)
    throw new Error(`deploy info not found for chain ID ${chainId}, please deploy by running \`truffle migrate --network ${process.env.network}\``);

  return new ethers.Contract(deployInfo.address, buildInfo.abi, provider);
};

module.exports.loadTruffleNetwork = (truffleConfig) => {
  console.log("using network", process.env.network);
  const networkConfig = truffleConfig.networks[process.env.network];

  if (!networkConfig)
    throw Error("cannot load network config from truffle config file");

  return networkConfig;
};

module.exports.getProviderFromNetwork = (networkConfig) => {
  const rpcUrl = networkConfig.provider().engine?._providers?.find(p => p.rpcUrl)?.rpcUrl;
  if (!rpcUrl)
    throw new Error("cannot load rpc url from truffle config provider");
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(process.env.controlKey, provider);

  return { rpcUrl, provider, wallet };
}
