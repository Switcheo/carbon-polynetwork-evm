const Council = artifacts.require('Council')

module.exports = function(deployer) {
    deployer.deploy(Council)
}
