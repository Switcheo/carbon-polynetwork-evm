const { getVault, getCouncil, getUpdateVotingPowersParams, getAddMerkleRootParams,
        assertAsync, assertReversion } = require('../utils')
const { ZERO_BYTES, ETHER_ADDR } = require('../constants')

contract('Test addMerkleRoot', async (accounts) => {
    let council, vault
    const deployer = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]
    const user3 = accounts[3]

    const merkleRoot = web3.utils.soliditySha3(
        { type: 'string', value: 'example root' }
    )
    const withdrawalHash = web3.utils.soliditySha3(
        { type: 'string', value: 'example withdrawal hash' }
    )

    beforeEach(async () => {
        vault = await getVault()
        council = await getCouncil()
        const params = await getUpdateVotingPowersParams({
            voters: [user1, user2, deployer],
            powers: [250, 50, 0],
            totalPower: 300,
            nonce: 1,
            signers: [deployer]
        })
        await council.updateVotingPowers(...params)
        await vault.addWithdrawer(council.address, 100, { from: deployer })
        await vault.removeWithdrawer({ from: deployer })
    })

    contract('when parameters are valid', async () => {
        it('stores the merkle root', async () => {
            const blockTime = 7
            await assertAsync(council.merkleRoots(blockTime), ZERO_BYTES)
            const params = await getAddMerkleRootParams({
                merkleRoot,
                blockTime: blockTime,
                processedDeposits: [],
                withdrawalHash,
                signers: [user1, user2]
            })

            await council.addMerkleRoot(...params)
            await assertAsync(council.merkleRoots(blockTime), merkleRoot)
        })
    })

    contract('when parameters are valid', async () => {
        it('updates the latest block time', async () => {
            const blockTime = 7
            await assertAsync(council.latestBlockTime(), 0)
            const params = await getAddMerkleRootParams({
                merkleRoot,
                blockTime: blockTime,
                processedDeposits: [],
                withdrawalHash,
                signers: [user1, user2]
            })

            await council.addMerkleRoot(...params)
            await assertAsync(council.latestBlockTime(), blockTime)
        })
    })

    contract('when a larger block time already exists', async () => {
        it('does not update the latest block time', async () => {
            const blockTime = 7
            await assertAsync(council.latestBlockTime(), 0)
            await assertAsync(council.merkleRoots(blockTime), ZERO_BYTES)
            await council.addMerkleRoot(
                ...await getAddMerkleRootParams({
                    merkleRoot,
                    blockTime,
                    processedDeposits: [],
                    withdrawalHash,
                    signers: [user1, user2]
                })
            )
            await assertAsync(council.merkleRoots(blockTime), merkleRoot)
            await assertAsync(council.latestBlockTime(), blockTime)

            const newMerkleRoot = web3.utils.soliditySha3(
                { type: 'string', value: 'new example root' }
            )
            const newWithdrawalHash = web3.utils.soliditySha3(
                { type: 'string', value: 'new example withdrawal hash' }
            )
            await council.addMerkleRoot(
                ...await getAddMerkleRootParams({
                    merkleRoot: newMerkleRoot,
                    blockTime: 5,
                    processedDeposits: [],
                    withdrawalHash: newWithdrawalHash,
                    signers: [user1, user2]
                })
            )

            await assertAsync(council.merkleRoots(5), newMerkleRoot)
            await assertAsync(council.latestBlockTime(), 7)
        })
    })

    contract('when parameters are valid', async () => {
        it('clears pending deposits', async () => {
            const externalAddress = 'swth1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'
            const senderAddress = 'sender1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'

            const nonce = 0
            const amount = web3.utils.toWei('1', 'ether')
            const message = web3.utils.soliditySha3(
                { type: 'string', value: 'pendingDeposit' },
                { type: 'address', value: vault.address },
                { type: 'address', value: user3 },
                { type: 'address', value: ETHER_ADDR },
                { type: 'uint256', value: amount },
                { type: 'uint256', value: nonce }
            )
            await assertAsync(vault.pendingDeposits(message), false)

            await vault.deposit(
                user3,
                externalAddress,
                senderAddress,
                { from: user3, value: amount }
            )
            await assertAsync(vault.pendingDeposits(message), true)

            const blockTime = 7
            const params = await getAddMerkleRootParams({
                merkleRoot,
                blockTime: blockTime,
                processedDeposits: [message],
                withdrawalHash,
                signers: [user1, user2]
            })
            await council.addMerkleRoot(...params)
            await assertAsync(vault.pendingDeposits(message), false)
        })
    })

    contract('when parameters are valid', async () => {
        it('stores the withdrawal hash with the network fee', async () => {
            const blockTime = 7
            await assertAsync(council.withdrawalHashes(withdrawalHash), 0)
            const params = await getAddMerkleRootParams({
                merkleRoot,
                blockTime: blockTime,
                processedDeposits: [],
                withdrawalHash,
                signers: [user1, user2]
            })

            const gasPrice = 70
            const result = await council.addMerkleRoot(...params, { gasPrice })
            const estimatedNetworkFee = await council.withdrawalHashes(withdrawalHash)
            const actualFee = result.receipt.gasUsed * gasPrice

            assert.equal(actualFee < estimatedNetworkFee, true, 'Actual fee is less than estimate')
            assert.equal(actualFee * 1.5 > estimatedNetworkFee, true, '150% of actual fee is more than estimated fee')
        })
    })

    contract('when the merkle root is empty', async () => {
        it('throws an error', async () => {
            const blockTime = 7
            const params = await getAddMerkleRootParams({
                merkleRoot: ZERO_BYTES,
                blockTime: blockTime,
                processedDeposits: [],
                withdrawalHash,
                signers: [user1, user2]
            })

            await assertReversion(
                council.addMerkleRoot(...params),
                'Merkle root cannot be empty'
            )
        })
    })

    contract('when the merkle root for the block time already exists', async () => {
        it('throws an error', async () => {
            const blockTime = 7
            await assertAsync(council.merkleRoots(blockTime), ZERO_BYTES)
            const params = await getAddMerkleRootParams({
                merkleRoot,
                blockTime: blockTime,
                processedDeposits: [],
                withdrawalHash,
                signers: [user1, user2]
            })

            await council.addMerkleRoot(...params)
            await assertAsync(council.merkleRoots(blockTime), merkleRoot)

            await assertReversion(
                council.addMerkleRoot(...params),
                'Merkle root for block height already exists'
            )
        })
    })

    contract('when there is insufficient voting power', async () => {
        it('throws an error', async () => {
            const blockTime = 7
            const params = await getAddMerkleRootParams({
                merkleRoot,
                blockTime: blockTime,
                processedDeposits: [],
                withdrawalHash,
                signers: [user2]
            })

            await assertReversion(
                council.addMerkleRoot(...params),
                'Insufficent voting power'
            )
        })
    })

    contract('when the withdrawal hash already exists', async () => {
        it('throws an error', async () => {
            const blockTime = 7
            const newMerkleRoot = web3.utils.soliditySha3(
                { type: 'string', value: 'new example root' }
            )

            await council.addMerkleRoot(
                ...await getAddMerkleRootParams({
                    merkleRoot,
                    blockTime,
                    processedDeposits: [],
                    withdrawalHash,
                    signers: [user1, user2]
                })
            )

            await assertReversion(
                council.addMerkleRoot(
                    ...await getAddMerkleRootParams({
                        merkleRoot: newMerkleRoot,
                        blockTime: 5,
                        processedDeposits: [],
                        withdrawalHash,
                        signers: [user1, user2]
                    })
                ),
                'Withdrawal hash already exists'
            )
        })
    })
})
