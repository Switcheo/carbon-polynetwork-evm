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
        uint256 feeAmount,
        bytes calldata feeAddress
    ) external payable returns (bool);
}

contract WalletFactory {
    bytes public constant SALT_PREFIX = "switcheo-eth-wallet-factory-v1";
    address public constant ETH_ASSET_ID = address(0);

    mapping(address => address) public nativeAddresses;
    mapping(address => string) public externalAddresses;
    mapping(bytes32 => bool) public seenMessages;

    uint64 public targetChainId;

    constructor(uint64 _targetChainId) public {
        targetChainId = _targetChainId;
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

    // _addresses[0]: walletAddress
    // _addresses[1]: lockProxyAddress
    // _values[0]: amount
    // _values[1]: feeAmount
    // _values[2]: nonce
    function sendEth(
        address[] memory _addresses,
        bytes memory _targetProxyHash,
        bytes memory _toAssetHash,
        bytes memory _feeAddress,
        uint256[] memory _values,
        uint8 _v,
        bytes32[] memory _rs
    )
        public
    {
        _validateWalletAddress(_addresses[0]);
        _validateSend(
            _addresses,
            ETH_ASSET_ID,
            _targetProxyHash,
            _toAssetHash,
            _feeAddress,
            _values,
            _v,
            _rs
        );

        _transferEthIn(_addresses[0], _values[0]);

        LockProxy lockProxy = LockProxy(_addresses[1]);
        lockProxy.lock{ value: _values[0] }(
            ETH_ASSET_ID,
            targetChainId,
            _targetProxyHash,
            _toAssetHash,
            _getExternalAddress(_addresses[0]),
            _values[0],
            _values[1],
            _feeAddress
        );
    }

    // _addresses[0]: walletAddress
    // _addresses[1]: lockProxyAddress
    // _addresses[2]: _assetHash
    // _values[0]: amount
    // _values[1]: feeAmount
    // _values[2]: nonce
    function sendERC20(
        address[] memory _addresses,
        bytes memory _targetProxyHash,
        bytes memory _toAssetHash,
        bytes memory _feeAddress,
        uint256[] memory _values,
        uint8 _v,
        bytes32[] memory _rs
    )
        public
    {
        _validateWalletAddress(_addresses[0]);
        _validateSend(
            _addresses,
            _addresses[2],
            _targetProxyHash,
            _toAssetHash,
            _feeAddress,
            _values,
            _v,
            _rs
        );

        // move the tokens from the wallet to this contract
        _transferERC20In(_addresses[0], _addresses[2], _values[0]);
        // allow the lockproxy to spend the tokens transferred in
        // some coins require the approved amount to be zero
        // before it can be modified
        // so we always set the approved amount to zero first
        _setAllowance(_addresses[1], _addresses[2], 0);
        _setAllowance(_addresses[1], _addresses[2], _values[0]);

        LockProxy lockProxy = LockProxy(_addresses[1]);
        lockProxy.lock(
            _addresses[2],
            targetChainId,
            _targetProxyHash,
            _toAssetHash,
            _getExternalAddress(_addresses[0]),
            _values[0],
            _values[1],
            _feeAddress
        );

        // ensure that the lockproxy cannot spend anymore tokens
        _setAllowance(_addresses[1], _addresses[2], 0);
    }

    /// @dev Allow this contract to receive Ethereum
    receive() external payable {}

    // _values[0]: amount
    // _values[1]: feeAmount
    // _values[2]: nonce
    function _validateSend(
        address[] memory _addresses,
        address _assetHash,
        bytes memory _targetProxyHash,
        bytes memory _toAssetHash,
        bytes memory _feeAddress,
        uint256[] memory _values,
        uint8 _v,
        bytes32[] memory _rs
    )
        private
    {
        bytes32 message = keccak256(abi.encodePacked(
            "sendTokens",
            _addresses[1],
            _assetHash,
            _targetProxyHash,
            _toAssetHash,
            _feeAddress,
            _values[0],
            _values[1],
            _values[2]
        ));

        require(seenMessages[message] == false, "Message already seen");
        seenMessages[message] = true;

        address user = nativeAddresses[_addresses[0]];
        _validateSignature(message, user, _v, _rs[0], _rs[1]);
    }

    function _getExternalAddress(address _walletAddress) private view returns (bytes memory) {
        return bytes(externalAddresses[_walletAddress]);
    }

    function _validateWalletAddress(address _walletAddress) private view {
        require(nativeAddresses[_walletAddress] != address(0), "Wallet not registered");
    }

    function _transferEthIn(address _walletAddress, uint256 _amount) private {
        Wallet wallet = Wallet(address(uint160(_walletAddress)));
        wallet.sendETHToCreator(_amount);
    }

    function _transferERC20In(address _walletAddress, address _assetHash, uint256 _amount) private {
        Wallet wallet = Wallet(address(uint160(_walletAddress)));
        wallet.sendERC20ToCreator(_assetHash, _amount);
    }

    function _setAllowance(
        address _spender,
        address _assetId,
        uint256 _amount
    )
        private
    {
        ERC20 token = ERC20(_assetId);
        _callOptionalReturn(
            token,
            abi.encodeWithSelector(
                token.approve.selector,
                _spender,
                _amount
            )
        );
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

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     */
    function _callOptionalReturn(ERC20 token, bytes memory data) private {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves.

        // A Solidity high level call has three parts:
        //  1. The target address is checked to verify it contains contract code
        //  2. The call itself is made, and success asserted
        //  3. The return value is decoded, which in turn checks the size of the returned data.
        // solhint-disable-next-line max-line-length
        require(isContract(address(token)), "SafeERC20: call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = address(token).call(data);
        require(success, "SafeERC20: low-level call failed");

        if (returndata.length > 0) { // Return data is optional
            // solhint-disable-next-line max-line-length
            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
        }
    }

    /**
     * @dev Returns true if `account` is a contract.
     *
     * [IMPORTANT]
     * ====
     * It is unsafe to assume that an address for which this function returns
     * false is an externally-owned account (EOA) and not a contract.
     *
     * Among others, `isContract` will return false for the following
     * types of addresses:
     *
     *  - an externally-owned account
     *  - a contract in construction
     *  - an address where a contract will be created
     *  - an address where a contract lived, but was destroyed
     * ====
     */
    function isContract(address account) internal view returns (bool) {
        // According to EIP-1052, 0x0 is the value returned for not-yet created accounts
        // and 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470 is returned
        // for accounts without code, i.e. `keccak256('')`
        bytes32 codehash;
        bytes32 accountHash = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;
        // solhint-disable-next-line no-inline-assembly
        assembly { codehash := extcodehash(account) }
        return (codehash != accountHash && codehash != 0x0);
    }
}
