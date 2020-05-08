const Vault = artifacts.require('Vault')
const Council = artifacts.require('Council')
const WalletFactory = artifacts.require('WalletFactory')
const Wallet = artifacts.require('Wallet')
const JRCoin = artifacts.require('JRCoin')

const Web3 = require('web3')
const web3 = new Web3(Web3.givenProvider)

const { ETHER_ADDR } = require('../constants')

const abiDecoder = require('abi-decoder')
abiDecoder.addABI(JRCoin.abi)
abiDecoder.addABI(Vault.abi)
abiDecoder.addABI(Council.abi)

async function getVault() { return await Vault.deployed() }
async function getCouncil() { return await Council.deployed() }
async function getWalletFactory() { return await WalletFactory.deployed() }
async function getJrc() { return await JRCoin.deployed() }

function newAddress() {
    return web3.eth.accounts.create().address
}

function getWalletBytecodeHash() {
    const encodedParams = web3.eth.abi.encodeParameters([], []).slice(2)
    const constructorByteCode = `${Wallet.bytecode}${encodedParams}`
    return web3.utils.keccak256(constructorByteCode)
}

async function getWalletAddress(nativeAddress, externalAddress, vaultAddress) {
    const factory = await getWalletFactory()
    return factory.getWalletAddress(nativeAddress, externalAddress, vaultAddress, getWalletBytecodeHash())
}

async function createWallet({ nativeAddress, externalAddress, vaultAddress }) {
    const factory = await getWalletFactory()
    const walletAddress = await factory.createWallet.call(nativeAddress, externalAddress, vaultAddress)
    await factory.createWallet(nativeAddress, externalAddress, vaultAddress)

    return Wallet.at(walletAddress)
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

async function assertBalance(user, token, amount) {
    if (token === ETHER_ADDR) {
        await assertAsync(web3.eth.getBalance(user), amount)
        return
    }
    await assertAsync(token.balanceOf(user), amount)
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

async function getValidateSignatureParams({ message, signers }) {
    signers.sort((a, b) => {
        a = web3.utils.toBN(a)
        b = web3.utils.toBN(b)
        if (a.eq(b)) { return 0 }
        if (a.gt(b)) { return 1 }
        return -1
    })

    const signatures = { v: [], r: [], s: [] }
    for (let i = 0; i < signers.length; i++) {
        const { v, r, s } = await signMessage(message, signers[i])
        signatures.v.push(v)
        signatures.r.push(r)
        signatures.s.push(s)
    }

    return [
        message,
        signers,
        signatures.v,
        signatures.r,
        signatures.s
    ]
}

async function getUpdateVotingPowersParams({
    voters, powers, totalPower, nonce, signers
}) {
    const council = await getCouncil()
    const message = web3.utils.soliditySha3(
        { type: 'string', value: 'updateVotingPowers' },
        { type: 'address', value: council.address },
        { type: 'address[]', value: voters },
        { type: 'uint256[]', value: powers },
        { type: 'uint256', value: totalPower },
        { type: 'uint256', value: nonce }
    )

    const signatureParams = await getValidateSignatureParams({ message, signers })

    return [
        voters,
        powers,
        totalPower,
        nonce,
        signatureParams[1],
        signatureParams[2],
        signatureParams[3],
        signatureParams[4]
    ]
}

async function getAddWithdrawerParams({ withdrawer, nonce, signers }) {
    const council = await getCouncil()
    const message = web3.utils.soliditySha3(
        { type: 'string', value: 'addWithdrawer' },
        { type: 'address', value: council.address },
        { type: 'address', value: withdrawer },
        { type: 'uint256', value: nonce }
    )

    const signatureParams = await getValidateSignatureParams({ message, signers })

    return [
        withdrawer,
        nonce,
        signatureParams[1],
        signatureParams[2],
        signatureParams[3],
        signatureParams[4]
    ]
}

async function getRemoveWithdrawerParams({ signers }) {
    const council = await getCouncil()
    const message = web3.utils.soliditySha3(
        { type: 'string', value: 'removeWithdrawer' },
        { type: 'address', value: council.address }
    )

    const signatureParams = await getValidateSignatureParams({ message, signers })

    return [
        signatureParams[1],
        signatureParams[2],
        signatureParams[3],
        signatureParams[4]
    ]
}

async function getAddMerkleRootParams({
    merkleRoot, blockTime, processedDeposits, withdrawalHash, signers
}) {
    const council = await getCouncil()
    const message = web3.utils.soliditySha3(
        { type: 'string', value: 'addMerkleRoot' },
        { type: 'address', value: council.address },
        { type: 'bytes32', value: merkleRoot },
        { type: 'uint256', value: blockTime },
        { type: 'bytes32[]', value: processedDeposits },
        { type: 'bytes32', value: withdrawalHash }
    )

    const signatureParams = await getValidateSignatureParams({ message, signers })

    return [
        merkleRoot,
        blockTime,
        processedDeposits,
        withdrawalHash,
        signatureParams[1],
        signatureParams[2],
        signatureParams[3],
        signatureParams[4]
    ]
}

async function hashWithdrawal({
    receivingAddress, assetId, amount, conversionNumerator, conversionDenominator, nonce
}) {
    const council = await getCouncil()
    const message = web3.utils.soliditySha3(
        { type: 'string', value: 'withdraw' },
        { type: 'address', value: council.address },
        { type: 'address', value: receivingAddress },
        { type: 'address', value: assetId },
        { type: 'uint256', value: amount },
        { type: 'uint256', value: conversionNumerator },
        { type: 'uint256', value: conversionDenominator },
        { type: 'uint256', value: nonce }
    )

    return message
    // return message.slice(2)
    // return Buffer.from(message.slice(2), 'hex')
}

module.exports = {
    web3,
    getVault,
    getCouncil,
    newAddress,
    getWalletBytecodeHash,
    getWalletFactory,
    getWalletAddress,
    getJrc,
    createWallet,
    assertEqual,
    assertAsync,
    assertReversion,
    assertEvents,
    assertBalance,
    signMessage,
    getValidateSignatureParams,
    getUpdateVotingPowersParams,
    getAddWithdrawerParams,
    getRemoveWithdrawerParams,
    getAddMerkleRootParams,
    hashWithdrawal
}
