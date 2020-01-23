const Vault = require('../build/contracts/Vault.json')
const Web3 = require('web3')

const PrivateKeyProvider = require('truffle-privatekey-provider')
const provider = new PrivateKeyProvider(
    process.env.controlKey,
    'https://ropsten.infura.io/v3/' + process.env.infuraKey
)

const web3 = new Web3(provider)

const VAULT_ADDRESS = process.env.vaultAddress

async function deposit({ amount, externalAddress, externalSignature }) {
    const nonce = await web3.eth.getTransactionCount(process.env.address)
    const vault = new web3.eth.Contract(Vault.abi, VAULT_ADDRESS)
    const method = vault.methods.deposit(
        web3.utils.asciiToHex(externalAddress),
        web3.utils.asciiToHex(externalSignature)
    )
    const transaction = {
        to: VAULT_ADDRESS,
        value: web3.utils.toWei(amount.toString(), 'ether'),
        data: method.encodeABI(),
        gas: '200000',
        gasPrice: web3.utils.toWei('20', 'gwei'),
        nonce: nonce.toString(),
        chainId: 3
    }

    const signedTxn = await web3.eth.accounts.signTransaction(transaction, process.env.controlKey)
    const transactionHash = web3.utils.keccak256(signedTxn.rawTransaction)
    console.log('transactionHash', transactionHash)

    web3.eth.sendSignedTransaction(signedTxn.rawTransaction)
    console.log('transaction sent')
}

deposit({ amount: 0.1, externalAddress: 'cosmos_addr', externalSignature: 'cosmos_sig' })
