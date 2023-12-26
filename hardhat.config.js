require('dotenv').config()

require('@nomiclabs/hardhat-etherscan')
require('@nomiclabs/hardhat-waffle')
// require('hardhat-gas-reporter')
// require('solidity-coverage')

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})


// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      {
        version: '0.8.4',
      },
    ],
  },
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545',
      polyId: 2,
    },
    hardhat: {
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/7cf21eaee93b49529f4da0ba7cf211af`,
      accounts: [process.env.controlKey,],
    },
    arbitrum: {
      url: `https://arb1.arbitrum.io/rpc`,
      accounts: [process.env.controlKey,],
      apiKey: process.env.etherscanVerifyAPIKey,
    },
    bsc: {
      url: `https://bsc-dataseed1.defibit.io/`,
      accounts: [process.env.controlKey,],
    },
    heco: {
      url: `https://http-mainnet.hecochain.com`,
      accounts: [],
    },
    ok: {
      url: `https://exchainrpc.okex.org/`,
      accounts: [],
    },
    polygon: {
      url: `https://rpc-mainnet.matic.network`,
      accounts: [],
    },
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/Rog1kuZQf1R8X7EAmsXs7oFyQXyzIH-4`,
      accounts: [process.env.controlKey,],
    },
    polygon_testnet: {
      url: 'https://matic-mumbai.chainstacklabs.com/',
      accounts: [process.env.controlKey,],
    },
    polygon: {
      url: 'https://1rpc.io/matic',
      accounts: [process.env.controlKey,],
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/9bca539684b6408d9dbcbb179e593eab`,
      accounts: [process.env.controlKey,],
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/7cf21eaee93b49529f4da0ba7cf211af`,
      accounts: [process.env.controlKey,],
    },
    arbitrum_testnet: {
      url: `https://rinkeby.arbitrum.io/rpc`,
      accounts: [],
    },
    bsc_testnet: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545`,
      accounts: [],
    },
    heco_testnet: {
      url: `https://http-testnet.hecochain.com`,
      accounts: [],
    },
    ok_testnet: {
      url: `https://exchaintestrpc.okex.org/`,
      accounts: [],
    },
    polygon_testnet: {
      url: `https://rpc-mumbai.maticvigil.com`,
      accounts: [],
    },
    // ropsten: {
    //   url: process.env.ROPSTEN_URL || "",
    //   accounts:
    //     process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    // },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.etherscanVerifyAPIKey,
    },
  }
}
