require('dotenv').config()

// See http://truffleframework.com/docs/advanced/configuration for more details
module.exports = {
    plugins: [
        'truffle-plugin-verify',
    ],
    api_keys: {
        etherscan: process.env.etherscanVerifyAPIKey,
        bscscan: process.env.bscVerifyAPIKey,
        hecoinfo: process.env.hecoVerifyAPIKey
    },
    networks: {
        development: {
            host: '127.0.0.1',
            port: 8545,
            network_id: '*' // Match any network id
        },
        ropsten: {
            provider: function() {
                const PrivateKeyProvider = require('truffle-privatekey-provider')
                return new PrivateKeyProvider(
                    process.env.controlKey,
                    'https://ropsten.infura.io/v3/9bca539684b6408d9dbcbb179e593eab'
                )
            },
            network_id: 3,
            gasPrice: 101 * 1000000000,
            // gas: 8000000,
            confirmations: 1,
            timeoutBlocks: 200,
            skipDryRun: true
        },
        rinkeby: {
            provider: function() {
                const PrivateKeyProvider = require('truffle-privatekey-provider')
                return new PrivateKeyProvider(
                    process.env.controlKey,
                    'https://rinkeby.infura.io/v3/7cf21eaee93b49529f4da0ba7cf211af'
                )
            },
            network_id: 4,
            confirmations: 1,
            timeoutBlocks: 200,
            skipDryRun: true
        },
        mainnet: {
            provider: function() {
                const PrivateKeyProvider = require('truffle-privatekey-provider')
                return new PrivateKeyProvider(
                    process.env.controlKey,
                    'https://eth-mainnet.alchemyapi.io/v2/' + process.env.alchemyKey
                )
            },
            network_id: 1,
            gasPrice: 20 * 1000000000
        },
        bsctestnet: {
            provider: function() {
                const PrivateKeyProvider = require('truffle-privatekey-provider')
                return new PrivateKeyProvider(
                    process.env.controlKey,
                    `https://data-seed-prebsc-1-s1.binance.org:8545/`
                )
            },
            network_id: 97,
            confirmations: 3,
            timeoutBlocks: 200,
            skipDryRun: true
        },
        bscmainnet: {
            provider: function() {
                const PrivateKeyProvider = require('truffle-privatekey-provider')
                return new PrivateKeyProvider(
                    process.env.controlKey,
                    `https://bsc-dataseed.binance.org/`
                )
            },
            network_id: 56,
            confirmations: 5,
            timeoutBlocks: 200,
            skipDryRun: true
        },
        hecomainnet: {
            provider: function() {
                const PrivateKeyProvider = require('truffle-privatekey-provider')
                return new PrivateKeyProvider(
                    process.env.controlKey,
                    `https://http-mainnet.hecochain.com/`
                )
            },
            network_id: 128,
            confirmations: 5,
            timeoutBlocks: 200,
            skipDryRun: true
        }
    },
    compilers: {
        solc: {
            version: '0.6.12',
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        }
    }
}
