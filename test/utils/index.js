const BalanceReader = artifacts.require('BalanceReader')
const LockProxy = artifacts.require('LockProxy')
const CCMMock = artifacts.require('CCMMock')
const Wallet = artifacts.require('Wallet')
const JRCoin = artifacts.require('JRCoin')

const Web3 = require('web3')
const web3 = new Web3(Web3.givenProvider)

const { ETHER_ADDR } = require('../constants')

const abiDecoder = require('abi-decoder')
abiDecoder.addABI(JRCoin.abi)
abiDecoder.addABI(LockProxy.abi)

async function getBalanceReader() { return await BalanceReader.deployed() }
async function getLockProxy() { return await LockProxy.deployed() }
async function getCcm() { return await CCMMock.deployed() }
async function getJrc() { return await JRCoin.deployed() }

function newAddress() {
    return web3.eth.accounts.create().address
}

function getWalletBytecodeHash() {
    const encodedParams = web3.eth.abi.encodeParameters([], []).slice(2)
    const constructorByteCode = `${Wallet.bytecode}${encodedParams}`
    return web3.utils.keccak256(constructorByteCode)
}

async function getWalletAddress(owner, swthAddress) {
    const proxy = await getLockProxy()
    return proxy.getWalletAddress(owner, swthAddress, getWalletBytecodeHash())
}

async function createWallet({ owner, swthAddress }) {
    const proxy = await getLockProxy()
    const walletAddress = await getWalletAddress(owner, swthAddress)
    await proxy.createWallet(owner, swthAddress)

    return Wallet.at(walletAddress)
}

async function lockFromWallet(
    { walletAddress, assetHash, targetProxyHash, toAssetHash, feeAddress, amount, feeAmount, nonce, callAmount, signer }
) {
    if (callAmount === undefined) {
        callAmount = amount
    }

    const message = web3.utils.soliditySha3(
        { type: 'string', value: 'sendTokens' },
        { type: 'address', value: assetHash },
        { type: 'bytes', value: targetProxyHash },
        { type: 'bytes', value: toAssetHash },
        { type: 'bytes', value: feeAddress },
        { type: 'uint256', value: amount },
        { type: 'uint256', value: feeAmount },
        { type: 'uint256', value: nonce }
    )
    const { v, r, s } = await signMessage(message, signer)

    const proxy = await getLockProxy()
    return await proxy.lockFromWallet(
        walletAddress,
        assetHash,
        targetProxyHash,
        toAssetHash,
        feeAddress,
        [amount, feeAmount, nonce, callAmount],
        v,
        [r, s]
    )
}

function assertEqual(valueA, valueB) {
    if (valueA.toString !== undefined) { valueA = valueA.toString() }
    if (valueB.toString !== undefined) { valueB = valueB.toString() }
    assert.equal(valueA, valueB)
}

async function assertAsync(promise, value) {
    const result = await promise
    assertEqual(result, value)
}

async function assertReversion(promise, errorMessage) {
    try {
        await promise
    } catch (error) {
        if (errorMessage !== undefined) {
            const messageFound = error.message.search(errorMessage) >= 0
            assert(messageFound, `Expected "${errorMessage}", got ${error} instead`)
        } else {
            const revertFound = error.message.search('revert') >= 0
            assert(revertFound, `Expected "revert", got ${error} instead`)
        }
        return
    }
    assert.fail('Expected an EVM revert but no error was encountered')
}

function parseLogs(receiptLogs) {
    const logs = abiDecoder.decodeLogs(receiptLogs)
    const decodedLogs = []
    for (const log of logs) {
        const decodedLog = { name: log.name, args: {} }
        for (const event of log.events) {
            decodedLog.args[event.name] = event.value
        }
        decodedLogs.push(decodedLog)
    }
    return decodedLogs
}

function assertEvents(result, logsB, { start, end } = {}) {
    let logsA
    if (result.receipt.logs) { logsA = result.receipt.logs }
    if (result.receipt.rawLogs) { logsA = result.receipt.rawLogs }
    logsA = parseLogs(logsA)

    if (logsB.length === 0) {
        throw new Error('logsB is empty')
    }

    if (start !== undefined && end !== undefined) {
        logsA = logsA.slice(start, end)
    }

    assert.equal(
        logsA.length * 2,
        logsB.length,
        'log length mismatch'
    )

    for (let i = 0; i < logsA.length; i++) {
        const logA = logsA[i]
        const logB = {
            name: logsB[i * 2],
            args: logsB[i * 2 + 1]
        }

        assert.equal(
            logA.name,
            logB.name,
            'event type is ' + logB.name
        )

        const argsB = logB.args
        if (Object.keys(argsB).length === 0) {
            throw new Error('argsB is empty')
        }

        for (const key in argsB) {
            const argA = logA.args[key]
            const argB = argsB[key]
            if (argA === undefined) {
                throw new Error('value for ' + argB.name + '.' + key + ' is undefined')
            }

            if (argA === null) {
                assert.equal(
                    argA,
                    argB,
                    'value for ' + key + ' is: ' + argA + ', expected: ' + argB
                )
            } else {
                assert.equal(
                    argA.toString().toLowerCase(),
                    argB.toString().toLowerCase(),
                    'value for ' + key + ' is :' + argA + ', expected: ' + argB
                )
            }
        }
    }
}

function parseSignature(signature) {
    const sig = signature.slice(2)
    const v = web3.utils.hexToNumber('0x' + sig.slice(128, 130)) + 27
    const r = `0x${sig.slice(0, 64)}`
    const s = `0x${sig.slice(64, 128)}`
    return { v, r, s }
}

async function signMessage(message, signer) {
    const signature = await web3.eth.sign(message, signer)
    return parseSignature(signature)
}

module.exports = {
    web3,
    getBalanceReader,
    newAddress,
    getWalletBytecodeHash,
    getLockProxy,
    getCcm,
    getWalletAddress,
    getJrc,
    createWallet,
    lockFromWallet,
    assertEqual,
    assertAsync,
    assertReversion,
    assertEvents,
    parseSignature,
    signMessage,
    parseLogs
}
