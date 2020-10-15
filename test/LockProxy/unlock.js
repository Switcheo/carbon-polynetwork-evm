const { web3, getJrc, getLockProxy, getCcm, assertAsync, assertReversion } = require('../utils')
const { ETH_ASSET_HASH } = require('../constants')

const { LOCAL_COUNTERPART_CHAIN_ID } = require('../constants')

contract('Test unlock', async (accounts) => {
    let proxy
    let ccm
    let jrc
    const fromProxyHash = '0xa501f88f84f284c281e1e3c74cc27a895e27fdf0'
    const fromAssetHash = '0x746f6b656e'
    const chainId = LOCAL_COUNTERPART_CHAIN_ID

    beforeEach(async () => {
        proxy = await getLockProxy()
        ccm = await getCcm()
        jrc = await getJrc()
        jrc.mint(accounts[0], 500)
    })

    contract('when parameters are valid', async () => {
        it('sends eth to the receiving address', async () => {
            // generate a new address as eth balances for users are not resetted between tests
            const receiver = (web3.eth.accounts.create()).address
            const amount = web3.utils.toWei('0.2', 'ether')
            await proxy.send(amount)
            await assertAsync(web3.eth.getBalance(proxy.address), amount)
            await assertAsync(web3.eth.getBalance(receiver), '0')

            await ccm.registerAsset(proxy.address, ETH_ASSET_HASH, fromProxyHash, fromAssetHash, chainId)

            await ccm.unlock(
                proxy.address,
                fromProxyHash,
                fromAssetHash,
                ETH_ASSET_HASH,
                receiver,
                amount,
                chainId
            )

            await assertAsync(web3.eth.getBalance(proxy.address), '0')
            await assertAsync(web3.eth.getBalance(receiver), amount)
        })
    })

    contract('when parameters are valid', async () => {
        it('sends tokens to the receiving address', async () => {
            const receiver = (web3.eth.accounts.create()).address
            const amount = 200
            await jrc.transfer(proxy.address, amount)
            await assertAsync(jrc.balanceOf(proxy.address), amount)
            await assertAsync(jrc.balanceOf(receiver), '0')

            await ccm.registerAsset(proxy.address, jrc.address, fromProxyHash, fromAssetHash, chainId)

            await ccm.unlock(
                proxy.address,
                fromProxyHash,
                fromAssetHash,
                jrc.address,
                receiver,
                amount,
                chainId
            )

            await assertAsync(jrc.balanceOf(proxy.address), '0')
            await assertAsync(jrc.balanceOf(receiver), amount)
        })
    })

    contract('when the originating chain ID does not match the counterpartChainId', async () => {
        it('raises an error', async () => {
            const receiver = (web3.eth.accounts.create()).address
            const amount = web3.utils.toWei('0.2', 'ether')
            await proxy.send(amount)
            await assertAsync(web3.eth.getBalance(proxy.address), amount)
            await assertAsync(web3.eth.getBalance(receiver), '0')

            await ccm.registerAsset(proxy.address, ETH_ASSET_HASH, fromProxyHash, fromAssetHash, chainId)

            await assertReversion(ccm.unlock(
                proxy.address,
                fromProxyHash,
                fromAssetHash,
                ETH_ASSET_HASH,
                receiver,
                amount,
                chainId + 1
            ), 'Invalid chain ID')

            await assertAsync(web3.eth.getBalance(proxy.address), amount)
            await assertAsync(web3.eth.getBalance(receiver), '0')
        })
    })

    contract('when the asset has not been registered', async () => {
        it('raises an error', async () => {
            const receiver = (web3.eth.accounts.create()).address
            const amount = web3.utils.toWei('0.2', 'ether')
            await proxy.send(amount)
            await assertAsync(web3.eth.getBalance(proxy.address), amount)
            await assertAsync(web3.eth.getBalance(receiver), '0')

            await ccm.registerAsset(proxy.address, ETH_ASSET_HASH, fromProxyHash, fromAssetHash, chainId)

            await assertReversion(ccm.unlock(
                proxy.address,
                fromProxyHash,
                '0x1',
                ETH_ASSET_HASH,
                receiver,
                amount,
                chainId
            ), 'Asset not registered')

            await assertAsync(web3.eth.getBalance(proxy.address), amount)
            await assertAsync(web3.eth.getBalance(receiver), '0')
        })
    })
})
