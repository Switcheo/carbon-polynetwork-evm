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
                    'https://ropsten.infura.io/v3/' + process.env.infuraKey
                )
            },
            network_id: 3,
            gasPrice: 10 * 1000000000
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
            version: '0.5.16',
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        }
    }
}
