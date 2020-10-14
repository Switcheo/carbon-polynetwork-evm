const { web3, getLockProxy, getCcm, createWallet, assertAsync, assertReversion, lockFromWallet } = require('../utils')
const { LOCAL_COUNTERPART_CHAIN_ID } = require('../constants')

contract('Test lockFromWallet', async (accounts) => {
    let proxy
    let ccm
    let wallet
    const owner = accounts[1]
    const swthAddress = 'swth142ph88p9ju9wrmw65z6edq67f20p957m92ck9d'
    const targetProxyHash = '0xa501f88f84f284c281e1e3c74cc27a895e27fdf0'
    const toAssetHash = '0x657468'
    const assetHash = '0x0000000000000000000000000000000000000000'
    const chainId = LOCAL_COUNTERPART_CHAIN_ID

    beforeEach(async () => {
        proxy = await getLockProxy()
        ccm = await getCcm()
        wallet = await createWallet({ owner, swthAddress })
    })

    contract('when parameters are valid', async () => {
        it('sends eth from the wallet to the LockProxy', async () => {
            const nonce = 1
            const amount = web3.utils.toWei('0.2', 'ether')
            await ccm.registerAsset(proxy.address, assetHash, targetProxyHash, toAssetHash, chainId)
            await wallet.send(amount)
            await assertAsync(web3.eth.getBalance(wallet.address), amount)

            await lockFromWallet({
                walletAddress: wallet.address,
                assetHash,
                targetProxyHash,
                toAssetHash,
                amount: amount,
                feeAmount: '0',
                nonce,
                signer: owner
            })

            await assertAsync(web3.eth.getBalance(wallet.address), '0')
            await assertAsync(web3.eth.getBalance(proxy.address), amount)
        })
    })

    contract('if the asset is not yet registered', async () => {
        it('raises an error', async () => {
            const nonce = 1
            const amount = web3.utils.toWei('0.2', 'ether')
            await wallet.send(amount)
            await assertAsync(web3.eth.getBalance(wallet.address), amount)

            await assertReversion(lockFromWallet({
                walletAddress: wallet.address,
                assetHash,
                targetProxyHash,
                toAssetHash,
                amount: amount,
                feeAmount: '0',
                nonce,
                signer: owner
            }), 'Asset not registered')

            await assertAsync(web3.eth.getBalance(wallet.address), amount)
            await assertAsync(web3.eth.getBalance(proxy.address), '0')
        })
    })
})
