require("dotenv").config()

// See http://truffleframework.com/docs/advanced/configuration for more details
module.exports = {
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
                    'https://eth-ropsten.alchemyapi.io/v2/Rog1kuZQf1R8X7EAmsXs7oFyQXyzIH-4'
                )
            },
            network_id: 3,
            gasPrice: 40 * 1000000000,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: true
        },
        mainnet: {
            provider: function() {
                const PrivateKeyProvider = require('truffle-privatekey-provider')
                return new PrivateKeyProvider(
                    process.env.controlKey,
                    'https://mainnet.infura.io/v3/' + process.env.infuraKey
                )
            },
            network_id: 1,
            gasPrice: 20 * 1000000000
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
