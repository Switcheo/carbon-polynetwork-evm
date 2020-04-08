pragma solidity 0.6.5;

import "./Wallet.sol";
import "./lib/utils/Create2.sol";

contract WalletFactory {
    bytes public constant SALT_PREFIX = "switcheo-eth-wallet-factory-v1";

    function createWallet(
        address _nativeAddress,
        bytes calldata _externalAddress,
        address _vaultAddress
    )
        external
    {
        bytes32 salt = keccak256(abi.encodePacked(
            SALT_PREFIX,
            _nativeAddress,
            _externalAddress,
            _vaultAddress
        ));

        uint256 amount = 0;
        bytes memory bytecode = type(Wallet).creationCode;
        address walletAddress = Create2.deploy(amount, salt, bytecode);

        // use uint160 to cast `address` to `address payable`
        Wallet wallet = Wallet(address(uint160(walletAddress)));
        wallet.initialize(
            _nativeAddress,
            _externalAddress,
            _vaultAddress
        );
    }

    function getWalletAddress(
        address _nativeAddress,
        bytes calldata _externalAddress,
        address _vaultAddress,
        bytes32 bytecodeHash
    )
        external
        view
        returns (address)
    {
        bytes32 salt = keccak256(abi.encodePacked(
            SALT_PREFIX,
            _nativeAddress,
            _externalAddress,
            _vaultAddress
        ));

        return Create2.computeAddress(salt, bytecodeHash);
    }
}
