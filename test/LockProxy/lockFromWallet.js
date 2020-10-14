const { web3, getJrc, getLockProxy, getCcm, createWallet, assertAsync,
        assertReversion, lockFromWallet } = require('../utils')

const { ETH_ASSET_HASH } = require('../constants')
const { LOCAL_COUNTERPART_CHAIN_ID } = require('../constants')

contract('Test lockFromWallet', async (accounts) => {
    let proxy
    let ccm
    let wallet
    let jrc
    const owner = accounts[1]
    const swthAddress = '0x213a5f9f0477b2cfc3a65120971a027e10f9a7ab'
    const feeAddress = '0xaa83739c25970ae1eddaa0b596835e4a9e12d3db'
    const targetProxyHash = '0xa501f88f84f284c281e1e3c74cc27a895e27fdf0'
    const toAssetHash = '0x746f6b656e'
    const chainId = LOCAL_COUNTERPART_CHAIN_ID

    beforeEach(async () => {
        proxy = await getLockProxy()
        ccm = await getCcm()
        wallet = await createWallet({ owner, swthAddress })
        jrc = await getJrc()
        jrc.mint(accounts[0], 500)
    })

    contract('when parameters are valid', async () => {
        it('sends eth from the wallet to the LockProxy', async () => {
            const nonce = 1
            const amount = web3.utils.toWei('0.2', 'ether')
            await ccm.registerAsset(proxy.address, ETH_ASSET_HASH, targetProxyHash, toAssetHash, chainId)
            await wallet.send(amount)
            await assertAsync(web3.eth.getBalance(wallet.address), amount)

            await lockFromWallet({
                walletAddress: wallet.address,
                assetHash: ETH_ASSET_HASH,
                targetProxyHash,
                toAssetHash,
                feeAddress,
                amount,
                feeAmount: '0',
                nonce,
                signer: owner
            })

            await assertAsync(web3.eth.getBalance(wallet.address), '0')
            await assertAsync(web3.eth.getBalance(proxy.address), amount)
        })
    })

    contract('when parameters are valid', async () => {
        it('sends erc20 tokens from the wallet to the LockProxy', async () => {
            const nonce = 1
            const amount = 200
            await ccm.registerAsset(proxy.address, jrc.address, targetProxyHash, toAssetHash, chainId)
            await jrc.transfer(wallet.address, amount)
            await assertAsync(jrc.balanceOf(wallet.address), amount)

            await lockFromWallet({
                walletAddress: wallet.address,
                assetHash: jrc.address,
                targetProxyHash,
                toAssetHash,
                feeAddress,
                amount,
                feeAmount: '0',
                nonce,
                signer: owner
            })

            await assertAsync(jrc.balanceOf(wallet.address), '0')
            await assertAsync(jrc.balanceOf(proxy.address), amount)
        })
    })

    contract('if the wallet address was not previously recorded', async () => {
        it('raises an error', async () => {
            const nonce = 1
            const amount = 200
            await ccm.registerAsset(proxy.address, ETH_ASSET_HASH, targetProxyHash, toAssetHash, chainId)
            await wallet.send(amount)
            await assertAsync(web3.eth.getBalance(wallet.address), amount)

            await assertReversion(lockFromWallet({
                walletAddress: owner,
                assetHash: ETH_ASSET_HASH,
                targetProxyHash,
                toAssetHash,
                feeAddress,
                amount,
                feeAmount: '0',
                callAmount: 100,
                nonce,
                signer: owner
            }), 'Invalid wallet address')

            await assertAsync(web3.eth.getBalance(wallet.address), amount)
            await assertAsync(web3.eth.getBalance(proxy.address), '0')
        })
    })

    contract('if the eth transferred does not match the expected amount', async () => {
        it('raises an error', async () => {
            const nonce = 1
            const amount = 200
            await ccm.registerAsset(proxy.address, ETH_ASSET_HASH, targetProxyHash, toAssetHash, chainId)
            await wallet.send(amount)
            await assertAsync(web3.eth.getBalance(wallet.address), amount)

            await assertReversion(lockFromWallet({
                walletAddress: wallet.address,
                assetHash: ETH_ASSET_HASH,
                targetProxyHash,
                toAssetHash,
                feeAddress,
                amount,
                feeAmount: '0',
                callAmount: 100,
                nonce,
                signer: owner
            }), 'ETH transferred does not match the expected amount')

            await assertAsync(web3.eth.getBalance(wallet.address), amount)
            await assertAsync(web3.eth.getBalance(proxy.address), '0')
        })
    })

    contract('if the tokens transferred does not match the expected amount', async () => {
        it('raises an error', async () => {
            const nonce = 1
            const amount = 200
            await ccm.registerAsset(proxy.address, jrc.address, targetProxyHash, toAssetHash, chainId)
            await jrc.transfer(wallet.address, amount)
            await assertAsync(jrc.balanceOf(wallet.address), amount)

            await assertReversion(lockFromWallet({
                walletAddress: wallet.address,
                assetHash: jrc.address,
                targetProxyHash,
                toAssetHash,
                feeAddress,
                amount,
                feeAmount: '0',
                callAmount: 100,
                nonce,
                signer: owner
            }), 'Tokens transferred does not match the expected amount')

            await assertAsync(jrc.balanceOf(wallet.address), amount)
            await assertAsync(jrc.balanceOf(proxy.address), '0')
        })
    })

    contract('if the same parameters have been used before', async () => {
        it('raises an error', async () => {
            const nonce = 1
            const amount = 200
            await ccm.registerAsset(proxy.address, jrc.address, targetProxyHash, toAssetHash, chainId)
            await jrc.transfer(wallet.address, amount)
            await assertAsync(jrc.balanceOf(wallet.address), amount)

            await lockFromWallet({
                walletAddress: wallet.address,
                assetHash: jrc.address,
                targetProxyHash,
                toAssetHash,
                feeAddress,
                amount,
                feeAmount: '0',
                nonce,
                signer: owner
            })

            await assertAsync(jrc.balanceOf(wallet.address), '0')
            await assertAsync(jrc.balanceOf(proxy.address), amount)

            await jrc.transfer(wallet.address, amount)

            await assertReversion(lockFromWallet({
                walletAddress: wallet.address,
                assetHash: jrc.address,
                targetProxyHash,
                toAssetHash,
                feeAddress,
                amount,
                feeAmount: '0',
                nonce,
                signer: owner
            }), 'Message already seen')

            await assertAsync(jrc.balanceOf(wallet.address), amount)
            await assertAsync(jrc.balanceOf(proxy.address), amount)
        })
    })

    contract('if the signature is invalid', async () => {
        it('raises an error', async () => {
            const nonce = 1
            const amount = 200
            await ccm.registerAsset(proxy.address, jrc.address, targetProxyHash, toAssetHash, chainId)
            await jrc.transfer(wallet.address, amount)
            await assertAsync(jrc.balanceOf(wallet.address), amount)

            await assertReversion(lockFromWallet({
                walletAddress: wallet.address,
                assetHash: jrc.address,
                targetProxyHash,
                toAssetHash,
                feeAddress,
                amount,
                feeAmount: '0',
                callAmount: 100,
                nonce,
                signer: accounts[0]
            }), 'Invalid signature')

            await assertAsync(jrc.balanceOf(wallet.address), amount)
            await assertAsync(jrc.balanceOf(proxy.address), '0')
        })
    })
})
