pragma solidity 0.6.5;

interface ERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}

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

contract Wallet {
    address public owner;
    string public externalAddress;
    bool public isInitialized;
    uint64 public targetChainId;
    mapping(bytes32 => bool) public seenMessages;

    address public constant ETH_ASSET_ID = 0x0000000000000000000000000000000000000000;

    function initialize(address _owner, string calldata _externalAddress, uint64 _targetChainId) external {
        require(isInitialized == false, "Contract already initialized");
        isInitialized = true;
        owner = _owner;
        externalAddress = _externalAddress;
        targetChainId = _targetChainId;
    }

    // _values[0]: amount
    // _values[1]: feeAmount
    // _values[2]: nonce
    function sendEth(
        address _lockProxyAddress,
        bytes memory _targetProxyHash,
        bytes memory _toAssetHash,
        bytes memory _feeAddress,
        uint256[] memory _values,
        uint8 _v,
        bytes32[] memory _rs
    )
        public
    {
        _validateSend(
            _lockProxyAddress,
            ETH_ASSET_ID,
            _targetProxyHash,
            _toAssetHash,
            _feeAddress,
            _values,
            _v,
            _rs
        );

        LockProxy lockProxy = LockProxy(_lockProxyAddress);
        lockProxy.lock{ value: _values[0] }(
            ETH_ASSET_ID,
            targetChainId,
            _targetProxyHash,
            _toAssetHash,
            bytes(externalAddress),
            _values[0],
            _values[1],
            _feeAddress
        );
    }

    // _values[0]: amount
    // _values[1]: feeAmount
    // _values[2]: nonce
    function sendERC20(
        address _lockProxyAddress,
        address _assetId,
        bytes memory _targetProxyHash,
        bytes memory _toAssetHash,
        bytes memory _feeAddress,
        uint256[] memory _values,
        uint8 _v,
        bytes32[] memory _rs
    )
        public
    {
        _validateSend(
            _lockProxyAddress,
            _assetId,
            _targetProxyHash,
            _toAssetHash,
            _feeAddress,
            _values,
            _v,
            _rs
        );

        _setAllowance(_lockProxyAddress, _assetId, _values[0]);

        LockProxy lockProxy = LockProxy(_lockProxyAddress);
        lockProxy.lock(
            _assetId,
            targetChainId,
            _targetProxyHash,
            _toAssetHash,
            bytes(externalAddress),
            _values[0],
            _values[1],
            _feeAddress
        );
    }

    /// @dev Allow this contract to receive Ethereum
    receive() external payable {}

    // _values[0]: amount
    // _values[1]: feeAmount
    // _values[2]: nonce
    function _validateSend(
        address _lockProxyAddress,
        address _assetId,
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
            _lockProxyAddress,
            _assetId,
            _targetProxyHash,
            _toAssetHash,
            _feeAddress,
            _values[0],
            _values[1],
            _values[2]
        ));

        require(seenMessages[message] == false, "Message already seen");
        seenMessages[message] = true;

        _validateSignature(message, owner, _v, _rs[0], _rs[1]);
    }

    function _setAllowance(address _spender, address _assetId, uint256 _amount) private {
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
