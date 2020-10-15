const { getLockProxy, getCcm, assertAsync, assertReversion } = require('../utils')

const { LOCAL_COUNTERPART_CHAIN_ID } = require('../constants')

contract('Test removeExtension', async (accounts) => {
    let proxy
    let ccm
    const extension = '0x24413729d45c4ae27015cd181fdb0276d180626f'
    const chainId = LOCAL_COUNTERPART_CHAIN_ID

    beforeEach(async () => {
        proxy = await getLockProxy()
        ccm = await getCcm()
    })

    contract('when parameters are valid', async () => {
        it('removes an extension', async () => {
            await assertAsync(proxy.extensions(extension), false)
            await ccm.addExtension(proxy.address, extension, chainId)
            await assertAsync(proxy.extensions(extension), true)

            await ccm.removeExtension(proxy.address, extension, chainId)
            await assertAsync(proxy.extensions(extension), false)
        })
    })

    contract('when the originating chain ID does not match the counterpartChainId', async () => {
        it('adds an extension', async () => {
            await assertAsync(proxy.extensions(extension), false)
            await ccm.addExtension(proxy.address, extension, chainId)
            await assertAsync(proxy.extensions(extension), true)

            await assertReversion(ccm.removeExtension(proxy.address, extension, chainId + 1), 'Invalid chain ID')
            await assertAsync(proxy.extensions(extension), true)
        })
    })
})
