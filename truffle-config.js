require("dotenv").config();

// See http://truffleframework.com/docs/advanced/configuration for more details
module.exports = {
    plugins: [
        'truffle-plugin-verify',
        // 'truffle-source-verify'
    ],
    api_keys: {
        etherscan: process.env.verifyAPIKey,
        bscscan: process.env.verifyAPIKey,
        hecoinfo: process.env.verifyAPIKey
    },
    networks: {
        development: {
            host: '127.0.0.1',
            port: 7545,
            network_id: '*' // Match any network id
        },
        ropsten: {
            provider: function() {
                const PrivateKeyProvider = require('truffle-privatekey-provider')
                return new PrivateKeyProvider(
                    process.env.controlKey,
                    'https://eth-ropsten.alchemyapi.io/v2/' + process.env.alchemyKey
                )
            },
            network_id: 3,
            gasPrice: 30 * 1000000000
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
