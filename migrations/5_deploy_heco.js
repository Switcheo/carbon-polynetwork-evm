const SwitcheoTokenModifiable = artifacts.require('SwitcheoTokenModifiable')

module.exports = function(deployer) {
    deployer.deploy(SwitcheoTokenModifiable)
}
