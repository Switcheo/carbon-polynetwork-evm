const { MerkleTree } = require('../utils/merkleTree')
const { web3, getVault, getCouncil, getJrc, newAddress, assertBalance, assertAsync,
        getUpdateVotingPowersParams, getAddMerkleRootParams, hashWithdrawal } = require('../utils')
const { ETHER_ADDR } = require('../constants')

contract('Test withdraw', async (accounts) => {
    let vault, council, jrc
    let withdrawals, withdrawalLeaves
    const deployer = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]
    const user3 = accounts[3]
    const sender = 'sender1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5'
    const merkleRoot = web3.utils.soliditySha3(
        { type: 'string', value: 'example root' }
    )

    beforeEach(async () => {
        vault = await getVault()
        council = await getCouncil()
        jrc = await getJrc()
        await jrc.mint(user3, 200)

        // deposit tokens into contract
        await jrc.approve(vault.address, 100, { from: user3 })
        await vault.depositToken(
            user3,
            jrc.address,
            100,
            'swth1ju4rl33f6c8ptgch8gtmqqt85xrs3zz9txp4n5',
            sender,
            { from: user3 }
        )
        await assertBalance(vault.address, jrc, 100)

        // handover voting power to user1 and user2
        await council.updateVotingPowers(
            ...await getUpdateVotingPowersParams({
                voters: [user1, user2, deployer],
                powers: [250, 50, 0],
                totalPower: 300,
                nonce: 1,
                signers: [deployer]
            })
        )
        await vault.removeWithdrawer({ from: deployer })

        withdrawals = [
            {
                receivingAddress: newAddress(),
                assetId: jrc.address,
                amount: 10,
                conversionRate: [10, 2],
                nonce: 1
            },
            {
                receivingAddress: newAddress(),
                assetId: ETHER_ADDR,
                amount: web3.utils.toWei('1', 'ether'),
                conversionRate: [1, 1],
                nonce: 2
            },
            {
                receivingAddress: newAddress(),
                assetId: jrc.address,
                amount: 42,
                conversionRate: [30, 3],
                nonce: 3
            }
        ]

        withdrawalLeaves = [
            await hashWithdrawal(withdrawals[0]),
            await hashWithdrawal(withdrawals[1]),
            await hashWithdrawal(withdrawals[2])
        ]
    })

    contract('when parameters are valid', async () => {
        it('withdraws tokens', async () => {
            const withdrawal = withdrawals[0]
            const merkleTree = new MerkleTree(withdrawalLeaves)
            const withdrawalRoot = merkleTree.getHexRoot()
            await assertAsync(council.withdrawalHashes(withdrawalRoot), 0)

            await council.addMerkleRoot(
                ...await getAddMerkleRootParams({
                    merkleRoot,
                    blockTime: 7,
                    processedDeposits: [],
                    withdrawalHash: withdrawalRoot,
                    numWithdrawals: 1,
                    signers: [user1, user2]
                })
            )
            const networkFee = await council.withdrawalHashes(withdrawalRoot)
            assert.notEqual(networkFee, 0)

            const proof = merkleTree.getHexProof(withdrawalLeaves[0])

            await council.withdraw(
                withdrawalRoot,
                proof,
                withdrawal.receivingAddress,
                withdrawal.assetId,
                withdrawal.amount,
                withdrawal.conversionRate,
                withdrawal.nonce,
                sender,
                { from: user1 }
            )
        })
    })
})
