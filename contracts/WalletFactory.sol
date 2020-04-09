pragma solidity 0.6.5;

import "./Wallet.sol";

contract WalletFactory {
    bytes public constant SALT_PREFIX = "switcheo-eth-wallet-factory-v1";

    function createWallet(
        address _nativeAddress,
        string calldata _externalAddress,
        address _vaultAddress
    )
        external
        returns (address)
    {
        bytes32 salt = keccak256(abi.encodePacked(
            SALT_PREFIX,
            _nativeAddress,
            _externalAddress,
            _vaultAddress
        ));

        Wallet wallet = new Wallet{salt: salt}();

        wallet.initialize(
            _nativeAddress,
            _externalAddress,
            _vaultAddress
        );

        return address(wallet);
    }
}
