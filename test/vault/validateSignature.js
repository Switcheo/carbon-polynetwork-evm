const { web3, getVault } = require('../utils')

contract('Test validateSignature', async (accounts) => {
    let vault

    beforeEach(async () => {
        vault = await getVault()
    })

    contract('when parameters are valid', async () => {
        it('validates signature', async () => {
            const payload = {
                users: [],
                v: [],
                r: [],
                s: []
            }
            const count = 100
            const message = 'abc'
            for (let i = 0; i < count; i++) {
                const user = '0x359ef15fb3e86ddf050228f03336979fa5212480'
                const key = 'ba335f5d2c4725fc3a9c175f5575995495a83bb8c007164ff147392aa3f15b72'
                const { v, r, s } = web3.eth.accounts.sign(message, key)
                payload.users.push(user)
                payload.v.push(v)
                payload.r.push(r)
                payload.s.push(s)
            }

            const result = await vault.validateSignature(
                message,
                payload.users,
                payload.v,
                payload.r,
                payload.s
            )
            console.log('result', result.receipt.gasUsed)
        })
    })
})
