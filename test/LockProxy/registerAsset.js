const { web3, getJrc, getLockProxy, getCcm, assertAsync, assertReversion } = require('../utils')
const { ETH_ADDRESS, ZERO_BYTES } = require('../constants')

const { LOCAL_COUNTERPART_CHAIN_ID } = require('../constants')

contract('Test registerAsset', async (accounts) => {
    let proxy
    let ccm
    let jrc
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
        it('updates the registry for eth', async () => {
            await assertAsync(proxy.registry(ETH_ADDRESS), ZERO_BYTES)
            await ccm.registerAsset(proxy.address, ETH_ADDRESS, targetProxyHash, toAssetHash, chainId)
            const hash = web3.utils.soliditySha3(
                { type: 'bytes', value: targetProxyHash },
                { type: 'bytes', value: toAssetHash }
            )
            await assertAsync(proxy.registry(ETH_ADDRESS), hash)
        })
    })

    contract('when parameters are valid', async () => {
        it('updates the registry for a token', async () => {
            await assertAsync(proxy.registry(jrc.address), ZERO_BYTES)
            await ccm.registerAsset(proxy.address, jrc.address, targetProxyHash, toAssetHash, chainId)
            const hash = web3.utils.soliditySha3(
                { type: 'bytes', value: targetProxyHash },
                { type: 'bytes', value: toAssetHash }
            )
            await assertAsync(proxy.registry(jrc.address), hash)
        })
    })

    contract('when the originating chain ID does not match the counterpartChainId', async () => {
        it('raises an error', async () => {
            await assertAsync(proxy.registry(jrc.address), ZERO_BYTES)

            await assertReversion(
                ccm.registerAsset(proxy.address, jrc.address, targetProxyHash, toAssetHash, chainId + 1),
                'Invalid chain ID'
            )
            await assertAsync(proxy.registry(jrc.address), ZERO_BYTES)
        })
    })

    contract('when the targetProxyHash.length is not 20', async () => {
        it('raises an error', async () => {
            await assertAsync(proxy.registry(jrc.address), ZERO_BYTES)

            await assertReversion(
                ccm.registerAsset(proxy.address, jrc.address, targetProxyHash + 'a', toAssetHash, chainId),
                'Invalid proxyAddress'
            )
            await assertAsync(proxy.registry(jrc.address), ZERO_BYTES)
        })
    })

    contract('when the asset has already been registered', async () => {
        it('raises an error', async () => {
            await assertAsync(proxy.registry(jrc.address), ZERO_BYTES)
            await ccm.registerAsset(proxy.address, jrc.address, targetProxyHash, toAssetHash, chainId)
            const hash = web3.utils.soliditySha3(
                { type: 'bytes', value: targetProxyHash },
                { type: 'bytes', value: toAssetHash }
            )
            await assertAsync(proxy.registry(jrc.address), hash)

            const altTargetProxyHash = '0xa501f88f84f284c281e1e3c74cc27a895e27fdf1'
            await assertReversion(
                ccm.registerAsset(proxy.address, jrc.address, altTargetProxyHash, toAssetHash, chainId),
                'Asset already registered'
            )

            await assertAsync(proxy.registry(jrc.address), hash)
        })
    })
})
