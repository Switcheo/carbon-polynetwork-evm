const { web3, getJrc, getLockProxy, getCcm, assertAsync, assertReversion } = require('../utils')
const { ETH_ASSET_HASH } = require('../constants')

const { LOCAL_COUNTERPART_CHAIN_ID } = require('../constants')

contract('Test lock', async (accounts) => {
    let proxy
    let ccm
    let jrc
    const user = accounts[1]
    const swthAddress = '0x213a5f9f0477b2cfc3a65120971a027e10f9a7ab'
    const feeAddress = '0xaa83739c25970ae1eddaa0b596835e4a9e12d3db'
    const targetProxyHash = '0xa501f88f84f284c281e1e3c74cc27a895e27fdf0'
    const toAssetHash = '0x746f6b656e'
    const chainId = LOCAL_COUNTERPART_CHAIN_ID

    beforeEach(async () => {
        proxy = await getLockProxy()
        ccm = await getCcm()
        jrc = await getJrc()
        jrc.mint(accounts[0], 500)
    })

    contract('when parameters are valid', async () => {
        it('sends eth to the LockProxy', async () => {
            const amount = web3.utils.toWei('0.2', 'ether')
            await ccm.registerAsset(proxy.address, ETH_ASSET_HASH, targetProxyHash, toAssetHash, chainId)
            await assertAsync(web3.eth.getBalance(proxy.address), '0')

            await proxy.lock(
                ETH_ASSET_HASH,
                targetProxyHash,
                swthAddress,
                toAssetHash,
                feeAddress,
                [amount, '0', amount],
                { from: user, value: amount }
            )

            await assertAsync(web3.eth.getBalance(proxy.address), amount)
        })
    })

    contract('when parameters are valid', async () => {
        it('sends tokens to the LockProxy', async () => {
            const amount = 200
            await ccm.registerAsset(proxy.address, jrc.address, targetProxyHash, toAssetHash, chainId)
            await jrc.transfer(user, amount)
            await assertAsync(jrc.balanceOf(user), '200')
            await assertAsync(jrc.balanceOf(proxy.address), '0')

            await jrc.approve(proxy.address, amount, { from: user })

            await proxy.lock(
                jrc.address,
                targetProxyHash,
                swthAddress,
                toAssetHash,
                feeAddress,
                [amount, '0', '200'],
                { from: user }
            )

            await assertAsync(jrc.balanceOf(user), '0')
            await assertAsync(jrc.balanceOf(proxy.address), '200')
        })
    })

    contract('if the asset is not yet registered', async () => {
        it('raises an error', async () => {
            const amount = web3.utils.toWei('0.2', 'ether')
            await assertAsync(web3.eth.getBalance(proxy.address), '0')

            await assertReversion(proxy.lock(
                ETH_ASSET_HASH,
                targetProxyHash,
                swthAddress,
                toAssetHash,
                feeAddress,
                [amount, '0', amount],
                { from: user, value: amount }
            ), 'Asset not registered')

            await assertAsync(web3.eth.getBalance(proxy.address), '0')
        })
    })

    contract('if the amount of ETH transferred does not match the expected amount', async () => {
        it('raises an error', async () => {
            const amount = web3.utils.toWei('0.2', 'ether')
            await ccm.registerAsset(proxy.address, ETH_ASSET_HASH, targetProxyHash, toAssetHash, chainId)
            await assertAsync(web3.eth.getBalance(proxy.address), '0')

            await assertReversion(proxy.lock(
                ETH_ASSET_HASH,
                targetProxyHash,
                swthAddress,
                toAssetHash,
                feeAddress,
                [amount, '0', '0'], // callAmount is ignored for ETH deposits
                { from: user, value: '100' }
            ), 'ETH transferred does not match the expected amount')

            await assertAsync(web3.eth.getBalance(proxy.address), '0')
        })
    })

    contract('if the amount of tokens transferred does not match the expected amount', async () => {
        it('raises an error', async () => {
            const amount = 200
            await ccm.registerAsset(proxy.address, jrc.address, targetProxyHash, toAssetHash, chainId)
            await jrc.transfer(user, amount)
            await assertAsync(jrc.balanceOf(user), '200')
            await assertAsync(jrc.balanceOf(proxy.address), '0')

            await jrc.approve(proxy.address, amount, { from: user })

            await assertReversion(proxy.lock(
                jrc.address,
                targetProxyHash,
                swthAddress,
                toAssetHash,
                feeAddress,
                [amount, '0', '100'],
                { from: user }
            ), 'Tokens transferred does not match the expected amount')

            await assertAsync(jrc.balanceOf(proxy.address), '0')
        })
    })

    contract('if the targetProxyHash.length is not 20', async () => {
        it('raises an error', async () => {
            const amount = 200
            await ccm.registerAsset(proxy.address, jrc.address, targetProxyHash, toAssetHash, chainId)
            await jrc.transfer(user, amount)
            await jrc.approve(proxy.address, amount, { from: user })

            await assertReversion(proxy.lock(
                jrc.address,
                '0x123',
                swthAddress,
                toAssetHash,
                feeAddress,
                [amount, '0', '200'],
                { from: user }
            ), 'Invalid targetProxyHash')

            await assertAsync(jrc.balanceOf(proxy.address), '0')
        })
    })

    contract('if the toAssetHash is empty', async () => {
        it('raises an error', async () => {
            const amount = 200
            await ccm.registerAsset(proxy.address, jrc.address, targetProxyHash, toAssetHash, chainId)
            await jrc.transfer(user, amount)
            await jrc.approve(proxy.address, amount, { from: user })

            await assertReversion(proxy.lock(
                jrc.address,
                targetProxyHash,
                swthAddress,
                '0x',
                feeAddress,
                [amount, '0', '200'],
                { from: user }
            ), 'Empty toAssetHash')

            await assertAsync(jrc.balanceOf(proxy.address), '0')
        })
    })

    contract('if the toAddress is empty', async () => {
        it('raises an error', async () => {
            const amount = 200
            await ccm.registerAsset(proxy.address, jrc.address, targetProxyHash, toAssetHash, chainId)
            await jrc.transfer(user, amount)
            await jrc.approve(proxy.address, amount, { from: user })

            await assertReversion(proxy.lock(
                jrc.address,
                targetProxyHash,
                '0x',
                toAssetHash,
                feeAddress,
                [amount, '0', '200'],
                { from: user }
            ), 'Empty toAddress')

            await assertAsync(jrc.balanceOf(proxy.address), '0')
        })
    })

    contract('if the amount is 0', async () => {
        it('raises an error', async () => {
            const amount = 200
            await ccm.registerAsset(proxy.address, jrc.address, targetProxyHash, toAssetHash, chainId)
            await jrc.transfer(user, amount)
            await jrc.approve(proxy.address, amount, { from: user })

            await assertReversion(proxy.lock(
                jrc.address,
                targetProxyHash,
                swthAddress,
                toAssetHash,
                feeAddress,
                [0, '0', '0'],
                { from: user }
            ), 'Amount must be more than zero')

            await assertAsync(jrc.balanceOf(proxy.address), '0')
        })
    })

    contract('if the feeAmount is greater than the amount', async () => {
        it('raises an error', async () => {
            const amount = 200
            await ccm.registerAsset(proxy.address, jrc.address, targetProxyHash, toAssetHash, chainId)
            await jrc.transfer(user, amount)
            await jrc.approve(proxy.address, amount, { from: user })

            await assertReversion(proxy.lock(
                jrc.address,
                targetProxyHash,
                swthAddress,
                toAssetHash,
                feeAddress,
                [amount, '201', '200'],
                { from: user }
            ), 'Fee amount cannot be greater than amount')

            await assertAsync(jrc.balanceOf(proxy.address), '0')
        })
    })
})
