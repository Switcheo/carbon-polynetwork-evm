// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./libs/common/ZeroCopySource.sol";
import "./libs/common/ZeroCopySink.sol";
import "./libs/utils/ReentrancyGuard.sol";
import "./libs/utils/Utils.sol";

import "./Wallet.sol";

interface Ccm {
    function crossChain(uint64 _toChainId, bytes calldata _toContract, bytes calldata _method, bytes calldata _txData) external returns (bool);
}

interface CcmProxy {
    function getEthCrossChainManager() external view returns (address);
}

contract LockProxy is ReentrancyGuard {
    struct ExtensionTxArgs {
        bytes extensionAddress;
    }

    struct RegisterAssetTxArgs {
        bytes assetHash;
        bytes nativeAssetHash;
    }

    struct TxArgs {
        bytes fromAssetHash;
        bytes toAssetHash;
        bytes toAddress;
        uint256 amount;
        uint256 feeAmount;
        bytes feeAddress;
        bytes fromAddress;
        uint256 nonce;
    }

    bytes public constant SALT_PREFIX = "switcheo-eth-wallet-factory-v1";
    address public constant ETH_ASSET_HASH = address(0);

    CcmProxy public ccmProxy;
    uint64 public counterpartChainId;
    uint256 public currentNonce = 0;

    mapping(address => bytes32) public registry;
    mapping(bytes32 => bool) public seenMessages;
    mapping(address => bool) public extensions;

    event LockEvent(
        address fromAssetHash,
        address fromAddress,
        uint64 toChainId,
        bytes toAssetHash,
        bytes toAddress,
        bytes txArgs
    );

    event UnlockEvent(
        address toAssetHash,
        address toAddress,
        uint256 amount,
        bytes txArgs
    );

    constructor(address _ccmProxyAddress, uint64 _counterpartChainId) public {
        require(_counterpartChainId > 0, "counterpartChainId cannot be zero");
        require(_ccmProxyAddress != address(0), "ccmProxyAddress cannot be empty");
        counterpartChainId = _counterpartChainId;
        ccmProxy = CcmProxy(_ccmProxyAddress);
    }

    modifier onlyManagerContract() {
        require(
            msg.sender == ccmProxy.getEthCrossChainManager(),
            "msg.sender is not CCM"
        );
        _;
    }

    /// @dev Allow this contract to receive ERC223 tokens
    // An empty implementation is required so that the ERC223 token will not
    // throw an error on transfer
    function tokenFallback(address, uint, bytes calldata) external {}

    function getWalletAddress(
        address _ownerAddress,
        string calldata _swthAddress,
        bytes32 _bytecodeHash
    )
        external
        view
        returns (address)
    {
        bytes32 salt = _getSalt(
            _ownerAddress,
            _swthAddress
        );

        bytes32 data = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, _bytecodeHash)
        );

        return address(bytes20(data << 96));
    }

    function createWallet(
        address _ownerAddress,
        string calldata _swthAddress
    )
        external
        nonReentrant
        returns (bool)
    {
        require(_ownerAddress != address(0), "Empty ownerAddress");
        require(bytes(_swthAddress).length != 0, "Empty swthAddress");

        bytes32 salt = _getSalt(
            _ownerAddress,
            _swthAddress
        );

        Wallet wallet = new Wallet{salt: salt}();
        wallet.initialize(_ownerAddress, _swthAddress);

        return true;
    }

    function addExtension(
        bytes calldata _argsBs,
        bytes calldata /* _fromContractAddr */,
        uint64 _fromChainId
    )
        external
        onlyManagerContract
        nonReentrant
        returns (bool)
    {
        require(_fromChainId == counterpartChainId, "Invalid chain ID");

        ExtensionTxArgs memory args = _deserializeExtensionTxArgs(_argsBs);
        address extensionAddress = Utils.bytesToAddress(args.extensionAddress);
        extensions[extensionAddress] = true;

        return true;
    }

    function removeExtension(
        bytes calldata _argsBs,
        bytes calldata /* _fromContractAddr */,
        uint64 _fromChainId
    )
        external
        onlyManagerContract
        nonReentrant
        returns (bool)
    {
        require(_fromChainId == counterpartChainId, "Invalid chain ID");

        ExtensionTxArgs memory args = _deserializeExtensionTxArgs(_argsBs);
        address extensionAddress = Utils.bytesToAddress(args.extensionAddress);
        extensions[extensionAddress] = false;

        return true;
    }

    function registerAsset(
        bytes calldata _argsBs,
        bytes calldata _fromContractAddr,
        uint64 _fromChainId
    )
        external
        onlyManagerContract
        nonReentrant
        returns (bool)
    {
        require(_fromChainId == counterpartChainId, "Invalid chain ID");

        RegisterAssetTxArgs memory args = _deserializeRegisterAssetTxArgs(_argsBs);
        _markAssetAsRegistered(
            Utils.bytesToAddress(args.nativeAssetHash),
            _fromContractAddr,
            args.assetHash
        );

        return true;
    }

    function delegateAsset(
        bytes calldata _targetProxyHash,
        bytes calldata _toAssetHash
    )
        external
        nonReentrant
        returns (bool)
    {
        require(_targetProxyHash.length != 20, "Invalid targetProxyHash");

        address assetHash = msg.sender;
        _markAssetAsRegistered(assetHash, _targetProxyHash, _toAssetHash);

        RegisterAssetTxArgs memory txArgs = RegisterAssetTxArgs({
            assetHash: Utils.addressToBytes(assetHash),
            nativeAssetHash: _toAssetHash
        });

        bytes memory txData = _serializeRegisterAssetTxArgs(txArgs);

        Ccm ccm = _getCcm();
        require(
            ccm.crossChain(counterpartChainId, _targetProxyHash, "registerAsset", txData),
            "EthCrossChainManager crossChain executed error"
        );

        return true;
    }

    // _values[0]: amount
    // _values[1]: feeAmount
    // _values[2]: nonce
    // _values[3]: callAmount
    function lockFromWallet(
        address payable _walletAddress,
        address _assetHash,
        bytes calldata _targetProxyHash,
        bytes calldata _toAssetHash,
        bytes calldata _feeAddress,
        uint256[] calldata _values,
        uint8 _v,
        bytes32[] calldata _rs
    )
        external
        nonReentrant
        returns (bool)
    {
        Wallet wallet = Wallet(_walletAddress);
        _validateLockFromWallet(
            wallet.owner(),
            _assetHash,
            _targetProxyHash,
            _toAssetHash,
            _feeAddress,
            _values,
            _v,
            _rs
        );

        _transferInFromWallet(_walletAddress, _assetHash, _values[0], _values[3]);

        _lock(
            _assetHash,
            _targetProxyHash,
            _toAssetHash,
            bytes(wallet.swthAddress()),
            _values[0],
            _values[1],
            _feeAddress
        );

        return true;
    }

    // _values[0]: amount
    // _values[1]: feeAmount
    // _values[2]: nonce
    // _values[3]: callAmount
    function lock(
        address _assetHash,
        bytes calldata _targetProxyHash,
        bytes calldata _toAddress,
        bytes calldata _toAssetHash,
        bytes calldata _feeAddress,
        uint256[] calldata _values
    )
        external
        payable
        nonReentrant
        returns (bool)
    {

        _transferIn(_assetHash, _values[0], _values[3]);

        _lock(
            _assetHash,
            _targetProxyHash,
            _toAssetHash,
            _toAddress,
            _values[0],
            _values[1],
            _feeAddress
        );

        return true;
    }

    // withdrawals to certain receiving addresses might fail
    // this should be validated before the txn to the counterpart chain is sent
    function unlock(
        bytes calldata _argsBs,
        bytes calldata _fromContractAddr,
        uint64 _fromChainId
    )
        onlyManagerContract
        nonReentrant
        external
        returns (bool)
    {
        require(_fromChainId == counterpartChainId, "Invalid chain ID");

        TxArgs memory args = _deserializeTxArgs(_argsBs);
        require(args.fromAssetHash.length == 20, "Invalid fromAssetHash");
        require(args.toAssetHash.length == 20, "Invalid toAssetHash");

        address toAssetHash = Utils.bytesToAddress(args.toAssetHash);
        address toAddress = Utils.bytesToAddress(args.toAddress);

        _validateAssetRegistration(toAssetHash, _fromContractAddr, args.fromAssetHash);
        _transferOut(toAssetHash, toAddress, args.amount);

        emit UnlockEvent(toAssetHash, toAddress, args.amount, _argsBs);
        return true;
    }

    function transferToExtension(
        address _receivingAddress,
        address _assetHash,
        uint256 _amount
    )
        external
        returns (bool)
    {
        require(
            extensions[msg.sender] == true,
            "Invalid extension"
        );

        if (_assetHash == ETH_ASSET_HASH) {
            address(uint160(_receivingAddress)).transfer(_amount);
            return true;
        }

        ERC20 token = ERC20(_assetHash);
        _callOptionalReturn(
            token,
            abi.encodeWithSelector(
                token.approve.selector,
                _receivingAddress,
                _amount
            )
        );

        return true;
    }

    function _markAssetAsRegistered(
        address _assetHash,
        bytes memory _proxyAddress,
        bytes memory _toAssetHash
    )
        private
    {
        require(_proxyAddress.length == 20, "Invalid proxyAddress");
        require(
            registry[_assetHash] == bytes32(0),
            "Asset already registered"
        );

        bytes32 value = keccak256(abi.encodePacked(
            _proxyAddress,
            _toAssetHash
        ));

        registry[_assetHash] = value;
    }

    function _validateAssetRegistration(
        address _assetHash,
        bytes memory _proxyAddress,
        bytes memory _toAssetHash
    )
        private
        view
    {
        require(_proxyAddress.length == 20, "Invalid proxyAddress");
        bytes32 value = keccak256(abi.encodePacked(
            _proxyAddress,
            _toAssetHash
        ));
        require(registry[_assetHash] == value, "Asset not registered");
    }

    function _lock(
        address _fromAssetHash,
        bytes memory _targetProxyHash,
        bytes memory _toAssetHash,
        bytes memory _toAddress,
        uint256 _amount,
        uint256 _feeAmount,
        bytes memory _feeAddress
    )
        private
    {
        require(_targetProxyHash.length == 20, "invalid targetProxyHash");
        require(_toAssetHash.length == 20, "empty toAssetHash");
        require(_toAddress.length > 0, "empty toAddress");
        require(_amount > 0, "amount must be more than zero!");
        require(_feeAmount < _amount, "fee amount cannot be greater than amount");

        _validateAssetRegistration(_fromAssetHash, _targetProxyHash, _toAssetHash);

        TxArgs memory txArgs = TxArgs({
            fromAssetHash: Utils.addressToBytes(_fromAssetHash),
            toAssetHash: _toAssetHash,
            toAddress: _toAddress,
            amount: _amount,
            feeAmount: _feeAmount,
            feeAddress: _feeAddress,
            fromAddress: abi.encodePacked(msg.sender),
            nonce: _getNextNonce()
        });

        bytes memory txData = _serializeTxArgs(txArgs);
        Ccm ccm = _getCcm();
        require(
            ccm.crossChain(counterpartChainId, _targetProxyHash, "unlock", txData),
            "EthCrossChainManager crossChain executed error!"
        );

        emit LockEvent(_fromAssetHash, msg.sender, counterpartChainId, _toAssetHash, _toAddress, txData);
    }

    // _values[0]: amount
    // _values[1]: feeAmount
    // _values[2]: nonce
    function _validateLockFromWallet(
        address _walletOwner,
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
        _validateSignature(message, _walletOwner, _v, _rs[0], _rs[1]);
    }

    function _transferInFromWallet(
        address payable _walletAddress,
        address _assetHash,
        uint256 _amount,
        uint256 _callAmount
    )
        private
    {
        Wallet wallet = Wallet(_walletAddress);
        if (_assetHash == ETH_ASSET_HASH) {
            wallet.sendETHToCreator(_amount);
            return;
        }

        ERC20 token = ERC20(_assetHash);
        uint256 initialBalance = token.balanceOf(address(this));
        wallet.sendERC20ToCreator(_assetHash, _callAmount);
        uint256 transferredAmount = initialBalance - token.balanceOf(address(this));
        require(transferredAmount == _amount, "Tokens transferred does not match the expected amount");
    }

    function _transferIn(
        address _assetHash,
        uint256 _amount,
        uint256 _callAmount
    )
        private
    {
        if (_assetHash == ETH_ASSET_HASH) {
            require(msg.value == _amount, "Transferred ether does not equal amount");
            return;
        }

        ERC20 token = ERC20(_assetHash);
        uint256 initialBalance = token.balanceOf(address(this));
        _callOptionalReturn(
            token,
            abi.encodeWithSelector(
                token.transferFrom.selector,
                msg.sender,
                address(this),
                _callAmount
            )
        );
        uint256 transferredAmount = initialBalance - token.balanceOf(address(this));
        require(transferredAmount == _amount, "Tokens transferred does not match the expected amount");
    }

    function _transferOut(
        address _toAddress,
        address _assetHash,
        uint256 _amount
    )
        private
    {
        if (_assetHash == ETH_ASSET_HASH) {
            address(uint160(_toAddress)).transfer(_amount);
            return;
        }

        ERC20 token = ERC20(_assetHash);
        _callOptionalReturn(
            token,
            abi.encodeWithSelector(
                token.transfer.selector,
                _toAddress,
                _amount
            )
        );
    }

    function _transferERC20In(address _walletAddress, address _assetHash, uint256 _amount) private {
        Wallet wallet = Wallet(address(uint160(_walletAddress)));
        wallet.sendERC20ToCreator(_assetHash, _amount);
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

    function _serializeTxArgs(TxArgs memory args) internal pure returns (bytes memory) {
        bytes memory buff;
        buff = abi.encodePacked(
            ZeroCopySink.WriteVarBytes(args.fromAssetHash),
            ZeroCopySink.WriteVarBytes(args.toAssetHash),
            ZeroCopySink.WriteVarBytes(args.toAddress),
            ZeroCopySink.WriteUint255(args.amount),
            ZeroCopySink.WriteUint255(args.feeAmount),
            ZeroCopySink.WriteVarBytes(args.feeAddress),
            ZeroCopySink.WriteVarBytes(args.fromAddress),
            ZeroCopySink.WriteUint255(args.nonce)
        );
        return buff;
    }

    function _deserializeTxArgs(bytes memory valueBs) internal pure returns (TxArgs memory) {
        TxArgs memory args;
        uint256 off = 0;
        (args.fromAssetHash, off) = ZeroCopySource.NextVarBytes(valueBs, off);
        (args.toAssetHash, off) = ZeroCopySource.NextVarBytes(valueBs, off);
        (args.toAddress, off) = ZeroCopySource.NextVarBytes(valueBs, off);
        (args.amount, off) = ZeroCopySource.NextUint255(valueBs, off);
        return args;
    }

    function _serializeRegisterAssetTxArgs(RegisterAssetTxArgs memory args) internal pure returns (bytes memory) {
        bytes memory buff;
        buff = abi.encodePacked(
            ZeroCopySink.WriteVarBytes(args.assetHash),
            ZeroCopySink.WriteVarBytes(args.nativeAssetHash)
        );
        return buff;
    }

    function _deserializeRegisterAssetTxArgs(bytes memory valueBs) internal pure returns (RegisterAssetTxArgs memory) {
        RegisterAssetTxArgs memory args;
        uint256 off = 0;
        (args.assetHash, off) = ZeroCopySource.NextVarBytes(valueBs, off);
        (args.nativeAssetHash, off) = ZeroCopySource.NextVarBytes(valueBs, off);
        return args;
    }

    function _deserializeExtensionTxArgs(bytes memory valueBs) internal pure returns (ExtensionTxArgs memory) {
        ExtensionTxArgs memory args;
        uint256 off = 0;
        (args.extensionAddress, off) = ZeroCopySource.NextVarBytes(valueBs, off);
        return args;
    }

    function _getCcm() internal view returns (Ccm) {
      Ccm ccm = Ccm(ccmProxy.getEthCrossChainManager());
      return ccm;
    }

    function _getNextNonce() private returns (uint256) {
      currentNonce++;
      return currentNonce;
    }

    function _getSalt(
        address _ownerAddress,
        string memory _swthAddress
    )
        private
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(
            SALT_PREFIX,
            _ownerAddress,
            _swthAddress
        ));
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
        require(_isContract(address(token)), "SafeERC20: call to non-contract");

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
     * Among others, `_isContract` will return false for the following
     * types of addresses:
     *
     *  - an externally-owned account
     *  - a contract in construction
     *  - an address where a contract will be created
     *  - an address where a contract lived, but was destroyed
     * ====
     */
    function _isContract(address account) private view returns (bool) {
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
