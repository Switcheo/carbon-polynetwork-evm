pragma solidity 0.6.5;

import "./Wallet.sol";

contract WalletFactory {
    bytes public constant SALT_PREFIX = "switcheo-eth-wallet-factory-v1";

    function getWalletAddress(
        address _nativeAddress,
        string memory _externalAddress,
        address _vaultAddress,
        bytes32 _bytecodeHash
    )
        public
        view
        returns (address)
    {
        bytes32 salt = getSalt(
            _nativeAddress,
            _externalAddress,
            _vaultAddress
        );

        bytes32 data = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, _bytecodeHash)
        );

        return address(bytes20(data << 96));
    }

    function getSalt(
        address _nativeAddress,
        string memory _externalAddress,
        address _vaultAddress
    )
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(
            SALT_PREFIX,
            _nativeAddress,
            _externalAddress,
            _vaultAddress
        ));
    }


    function createWallet(
        address _nativeAddress,
        string calldata _externalAddress,
        address _vaultAddress
    )
        external
        returns (address)
    {
        bytes32 salt = getSalt(
            _nativeAddress,
            _externalAddress,
            _vaultAddress
        );

        Wallet wallet = new Wallet{salt: salt}();

        wallet.initialize(
            _nativeAddress,
            _externalAddress,
            _vaultAddress
        );

        return address(wallet);
    }

    function createWalletAndSendEth(
        address _nativeAddress,
        string calldata _externalAddress,
        address _vaultAddress,
        string calldata _senderAddress
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

        wallet.sendETH(_senderAddress);

        return address(wallet);
    }

    function createWalletAndSendERC20Tokens(
        address _nativeAddress,
        string calldata _externalAddress,
        address _vaultAddress,
        address _assetId,
        uint256 _amount,
        uint256 _maxAllowance,
        string calldata _senderAddress
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

        wallet.sendERC20Tokens(
            _assetId,
            _amount,
            _maxAllowance,
            _senderAddress
        );

        return address(wallet);
    }
}
