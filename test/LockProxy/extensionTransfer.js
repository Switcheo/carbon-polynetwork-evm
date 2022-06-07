const { getLockProxy, getCcm, getJrc, assertAsync, assertReversion } = require('../utils')

const { LOCAL_COUNTERPART_CHAIN_ID, ETH_ADDRESS } = require('../constants')

contract('Test extensionTransfer', async (accounts) => {
    let proxy
    let ccm
    let jrc
    const extension = accounts[0]
    const chainId = LOCAL_COUNTERPART_CHAIN_ID

    beforeEach(async () => {
        proxy = await getLockProxy()
        ccm = await getCcm()
        jrc = await getJrc()
        await jrc.mint(accounts[0], 500)
    })

    contract('when parameters are valid', async () => {
        it('transfers eth to the receiver', async () => {
            await ccm.addExtension(proxy.address, extension, chainId)

            const amount = web3.utils.toWei('0.2', 'ether')
            await proxy.send(amount)

            const receiver = (web3.eth.accounts.create()).address

            await assertAsync(web3.eth.getBalance(proxy.address), amount)
            await assertAsync(web3.eth.getBalance(receiver), '0')

            await proxy.extensionTransfer(receiver, ETH_ADDRESS, amount)

            await assertAsync(web3.eth.getBalance(proxy.address), '0')
            await assertAsync(web3.eth.getBalance(receiver), amount)
        })
    })

    contract('when parameters are valid', async () => {
        it('approves tokens for the mover', async () => {
            await ccm.addExtension(proxy.address, extension, chainId)

            const amount = 200
            await jrc.transfer(proxy.address, amount)
            const mover = accounts[1]
            const receiver = (web3.eth.accounts.create()).address

            await assertAsync(jrc.balanceOf(proxy.address), amount)
            await assertAsync(jrc.balanceOf(receiver), '0')
            await assertAsync(jrc.allowance(proxy.address, receiver), '0')

            await proxy.extensionTransfer(mover, jrc.address, amount)

            await assertAsync(jrc.balanceOf(proxy.address), amount)
            await assertAsync(jrc.balanceOf(receiver), '0')
            await assertAsync(jrc.allowance(proxy.address, mover), amount)

            await jrc.transferFrom(proxy.address, receiver, amount, { from: mover })
            await assertAsync(jrc.balanceOf(proxy.address), '0')
            await assertAsync(jrc.balanceOf(receiver), amount)
        })
    })

    contract('if the extension has not been added', async () => {
        it('raises an error', async () => {
            const amount = web3.utils.toWei('0.2', 'ether')
            await proxy.send(amount)

            const receiver = (web3.eth.accounts.create()).address

            await assertAsync(web3.eth.getBalance(proxy.address), amount)
            await assertAsync(web3.eth.getBalance(receiver), '0')

            await assertReversion(
                proxy.extensionTransfer(receiver, ETH_ADDRESS, amount),
                'Invalid extension'
            )

            await assertAsync(web3.eth.getBalance(proxy.address), amount)
            await assertAsync(web3.eth.getBalance(receiver), '0')
        })
    })
})
