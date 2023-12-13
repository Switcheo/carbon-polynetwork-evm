import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers'
import fs from 'fs'

// exploit block 153082115 

const startBlock = 50507900;
const exploitBlock = 153082115;
const endBlock = exploitBlock - 1;
const range = 1000000;

const bytes32Prefix = /^0x[0]{24}/;

(async () => {
  const filepath = "./scripts/carbonarb/transfers.txt";
  if (fs.existsSync(filepath)) fs.rmSync(filepath);
  const stream = fs.createWriteStream(filepath);

  const balances: { [hash: string]: BigNumber } = {}
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

  console.log("https://arb1.arbitrum.io/rpc")
  const provider = new ethers.providers.JsonRpcBatchProvider("https://arb1.arbitrum.io/rpc");
  const contractAbi = [{"inputs":[{"internalType":"address","name":"lockProxyAddress","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"burnLocked","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"circulatingSupply","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"lockProxyAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"}]; // Insert your contract ABI here
  const contract = new ethers.Contract("0xF763fa322Dc58dEe588252fAFee5f448e863b633", contractAbi, provider);
  const transferEventFilter = contract.filters.Transfer();

  let exit = false;
  let block = startBlock;
  while (true) {
    const toBlock = Math.min(block + range, endBlock)
    console.log("block", block + 1, toBlock);
    const transfers = await contract.queryFilter(transferEventFilter, block + 1, toBlock);

    transfers.forEach(t => {
      const b: number = t.blockNumber;
      const from = t.topics[1].replace(bytes32Prefix, "0x")
      const to = t.topics[2].replace(bytes32Prefix, "0x")
      const amount = new BigNumber(ethers.BigNumber.from(t.data).toString()).toString(10);
      stream.write(`${b.toString().padStart(9)} ${t.transactionHash} ${from} ${to} ${amount}\n`)

      if (from != ZERO_ADDRESS) {
        const currentBalance = balances[from] ?? new BigNumber(0)
        const newBalance = currentBalance.minus(amount)
        balances[from] = newBalance
      }

      if (to != ZERO_ADDRESS) {
        const currentBalance = balances[to] ?? new BigNumber(0)
        const newBalance = currentBalance.plus(amount)
        balances[to] = newBalance
      }

      // console.log(t.blockNumber, t.transactionHash, from, to, amount)
    });

    block += range;

    if (block + range >= endBlock) {
      if (exit) break;
      exit = true;
    }
  }

  const balancesArray = Object.entries(balances)
  const filteredBalances : { [hash: string]: BigNumber } = {}
  let count = 0
  for (const entry of balancesArray) {
    const address = entry[0]
    const balance = entry[1]
    if (balance.isGreaterThan(new BigNumber(0))) {
      count++
      filteredBalances[address] = balance
    }
  }

  // const currentBalancesArray = Object.entries(currentBalances)

  // for (const entry of currentBalancesArray) {
  //   const address = entry[0]
  //   const balance = new BigNumber(entry[1])

  //   if (!filteredBalances[address]) {
  //     console.log(`MISSING ADDRESS: ${address} of BALANCES: ${balance}\n`)
  //     continue
  //   }

  //   if (!balance.isEqualTo(filteredBalances[address])) {
  //     console.log(`CURRENT BALANCE AND PRE EXPLOIT BALANCE DIFFERS FOR ADDRESS ${address}:
  //       PRE EXPLOIT: ${filteredBalances[address]}
  //       CURRENT: ${balance}
  //       \n`)
  //   }
  // }

  const filteredBalancesArray = Object.entries(filteredBalances)
  const tokenOwnersArray: string[] = []
  const finalBalancesArray: Number[] = []

  for (const entry of filteredBalancesArray) {
    const address = entry[0]
    const balance = entry[1].toNumber()

    tokenOwnersArray.push(address)
    finalBalancesArray.push(balance)
  }

  fs.writeFileSync("./scripts/carbonarb/pre-kyber-exploit-carbon-arb-owners.json", JSON.stringify(tokenOwnersArray), 'utf8')

  fs.writeFileSync("./scripts/carbonarb/pre-kyber-exploit-carbon-arb-balances.json", JSON.stringify(finalBalancesArray), 'utf8')

  stream.close();
})().catch(console.error).finally(() => process.exit(0));