pragma solidity 0.6.5;

import "./Wallet.sol";

interface LockProxy {
    function lock(
        address fromAssetHash,
        uint64 toChainId,
        bytes calldata targetProxyHash,
        bytes calldata toAssetHash,
        bytes calldata toAddress,
        uint256 amount,
        bool deductFeeInLock,
        uint256 feeAmount,
        bytes calldata feeAddress
    ) external payable returns (bool);
}

contract WalletFactory {
    bytes public constant SALT_PREFIX = "switcheo-eth-wallet-factory-v1";
    address public constant ETH_ASSET_ID = 0x0000000000000000000000000000000000000000;

    mapping(address => address) public nativeAddresses;
    mapping(address => string) public externalAddresses;

    uint64 public targetChainId;
    LockProxy public lockProxy;

    constructor(uint64 _targetChainId, address _lockProxyAddress) public {
        targetChainId = _targetChainId;
        lockProxy = LockProxy(_lockProxyAddress);
    }

    function getWalletAddress(
        address _nativeAddress,
        string memory _externalAddress,
        bytes32 _bytecodeHash
    )
        public
        view
        returns (address)
    {
        bytes32 salt = getSalt(
            _nativeAddress,
            _externalAddress
        );

        bytes32 data = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, _bytecodeHash)
        );

        return address(bytes20(data << 96));
    }

    function getSalt(
        address _nativeAddress,
        string memory _externalAddress
    )
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(
            SALT_PREFIX,
            _nativeAddress,
            _externalAddress
        ));
    }

    function createWallet(
        address _nativeAddress,
        string calldata _externalAddress
    )
        external
    {
        require(_nativeAddress != address(0), "Empty nativeAddress");
        require(bytes(_externalAddress).length != 0, "Empty externalAddress");

        bytes32 salt = getSalt(
            _nativeAddress,
            _externalAddress
        );

        Wallet wallet = new Wallet{salt: salt}();
        wallet.initialize();

        address walletAddress = address(wallet);
        nativeAddresses[walletAddress] = _nativeAddress;
        externalAddresses[walletAddress] = _externalAddress;
    }

    function sendEth(
        address payable _walletAddress,
        bytes memory _targetProxyHash,
        bytes memory _toAssetHash,
        uint256 _amount,
        uint256 _feeAmount,
        bytes memory _feeAddress,
        uint8 _v,
        bytes32[] memory _rs
    )
        public
    {
        _validateWalletAddress(_walletAddress);
        _validateSend(
            _walletAddress,
            ETH_ASSET_ID,
            _targetProxyHash,
            _toAssetHash,
            _amount,
            _feeAmount,
            _feeAddress,
            _v,
            _rs
        );

        _transferEthIn(_walletAddress, _amount);

        lockProxy.lock{ value: _amount }(
            ETH_ASSET_ID,
            targetChainId,
            _targetProxyHash,
            _toAssetHash,
            _getExternalAddress(_walletAddress),
            _amount,
            false,
            _feeAmount,
            _feeAddress
        );
    }

    function sendERC20(
        address payable _walletAddress,
        address _assetHash,
        bytes memory _targetProxyHash,
        bytes memory _toAssetHash,
        uint256 _amount,
        uint256 _feeAmount,
        bytes memory _feeAddress,
        uint8 _v,
        bytes32[] memory _rs
    )
        public
    {
        _validateWalletAddress(_walletAddress);
        _validateSend(
            _walletAddress,
            _assetHash,
            _targetProxyHash,
            _toAssetHash,
            _amount,
            _feeAmount,
            _feeAddress,
            _v,
            _rs
        );

        _approveERC20(_walletAddress, _assetHash, _amount);

        lockProxy.lock(
            _assetHash,
            targetChainId,
            _targetProxyHash,
            _toAssetHash,
            _getExternalAddress(_walletAddress),
            _amount,
            false,
            _feeAmount,
            _feeAddress
        );
    }

    /// @dev Allow this contract to receive Ethereum
    receive() external payable {}

    function _validateSend(
        address payable _walletAddress,
        address _assetHash,
        bytes memory _targetProxyHash,
        bytes memory _toAssetHash,
        uint256 _amount,
        uint256 _feeAmount,
        bytes memory _feeAddress,
        uint8 _v,
        bytes32[] memory _rs
    )
        private
        view
    {
        bytes32 message = keccak256(abi.encodePacked(
            "sendTokens",
            _assetHash,
            _targetProxyHash,
            _toAssetHash,
            _amount,
            _feeAmount,
            _feeAddress
        ));

        address user = nativeAddresses[_walletAddress];
        _validateSignature(message, user, _v, _rs[0], _rs[1]);
    }

    function _getExternalAddress(address payable _walletAddress) private view returns (bytes memory) {
        return bytes(externalAddresses[_walletAddress]);
    }

    function _validateWalletAddress(address payable _walletAddress) private view {
        require(nativeAddresses[_walletAddress] != address(0), "Wallet not registered");
    }

    function _transferEthIn(address payable _walletAddress, uint256 _amount) private {
        uint256 initialBalance = address(this).balance;
        Wallet wallet = Wallet(_walletAddress);
        wallet.sendETHToCreator(_amount);
        require(address(this).balance - initialBalance == _amount, "Invalid transfer");
    }

    function _approveERC20(
        address payable _walletAddress,
        address _assetHash,
        uint256 _amount
    )
        private
    {
        address lockProxyAddress = address(lockProxy);
        Wallet wallet = Wallet(_walletAddress);
        wallet.setAllowance(lockProxyAddress, _assetHash, 0);
        wallet.setAllowance(lockProxyAddress, _assetHash, _amount);
    }

    function _validateSignature(
        bytes32 _message,
        address _user,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    )
        private
        pure
    {
        bytes32 prefixedMessage = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            _message
        ));

        require(
            _user == ecrecover(prefixedMessage, _v, _r, _s),
            "Invalid signature"
        );
    }
}
