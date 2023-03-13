
const hre = require('hardhat')

const abi = [
  "function whiteListFromContract(address) view returns (bool)",
  "function whiteListContractMethodMap(address,bytes) view returns (bool)",
]

async function main() {
  const lockproxyAddress = '0x43138036d1283413035b8eca403559737e8f7980';
  const bridgeEntranceAddress = '0x75d302266926CB34B7564AAF3102c258234A35F2';
  const ccmAddress = '0xB16FED79a6Cb9270956f045F2E7989AFfb75d459';

  const contract = new hre.ethers.Contract(ccmAddress, abi, hre.ethers.provider);
  console.log("lock proxy whitelisted      ", await contract.whiteListFromContract(lockproxyAddress))
  console.log("bridge entrance whitelisted ", await contract.whiteListFromContract(bridgeEntranceAddress))

  console.log("registerAsset whitelisted   ", await contract.whiteListContractMethodMap(lockproxyAddress, "0x" + Buffer.from("registerAsset", "utf8").toString("hex")));
  console.log("unlock whitelisted          ", await contract.whiteListContractMethodMap(lockproxyAddress, "0x" + Buffer.from("unlock", "utf8").toString("hex")));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
