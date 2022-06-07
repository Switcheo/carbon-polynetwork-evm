// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./libs/common/ZeroCopySource.sol";
import "./libs/common/ZeroCopySink.sol";
import "./libs/utils/ReentrancyGuard.sol";
import "./libs/utils/Utils.sol";
import "./libs/math/SafeMath.sol";

import "./Wallet.sol";

interface CCM {
    function crossChain(uint64 _toChainId, bytes calldata _toContract, bytes calldata _method, bytes calldata _txData) external returns (bool);
}

interface CCMProxy {
    function getEthCrossChainManager() external view returns (address);
}

/// @title The LockProxy contract for Switcheo TradeHub
/// @author Switcheo Network
/// @notice This contract faciliates deposits and withdrawals to Switcheo TradeHub.
/// @dev The contract also allows for additional features in the future through "extension" contracts.
contract LockProxy is ReentrancyGuard {
    using SafeMath for uint256;

    // used for cross-chain addExtension and removeExtension methods
    struct ExtensionTxArgs {
        bytes extensionAddress;
    }

    // used for cross-chain registerAsset method
    struct RegisterAssetTxArgs {
        bytes assetHash;
        bytes nativeAssetHash;
    }

    // used for cross-chain lock and unlock methods
    struct TransferTxArgs {
        bytes fromAssetHash;
        bytes toAssetHash;
        bytes toAddress;
        bytes fromAddress;
        uint256 amount;
        uint256 feeAmount;
        bytes feeAddress;
        uint256 nonce;
    }

    // used to create a unique salt for wallet creation
    bytes public constant SALT_PREFIX = "switcheo-eth-wallet-factory-v1";
    address public constant ETH_ADDRESS = address(0);

    address public immutable swthToken;
    CCMProxy public immutable ccmProxy;
    uint64 public immutable counterpartChainId;

    uint256 public currentNonce = 0;

    // a mapping of assetHashes to the hash of
    // (associated proxy address on Switcheo TradeHub, associated asset hash on Switcheo TradeHub)
    mapping(address => bytes32) public registry;

    // a record of signed messages to prevent replay attacks
    mapping(bytes32 => bool) public seenMessages;

    // a mapping of extension contracts
    mapping(address => bool) public extensions;

    // a record of created wallets
    mapping(address => bool) public wallets;

    event LockEvent(
        address indexed tokenAddress,
        address indexed fromAddress,
        uint64 indexed toChainId,
        bytes toAssetHash,
        bytes toAddress,
        bytes txArgs
    );

    event UnlockEvent(
        address indexed tokenAddress,
        address indexed toAddress,
        uint256 amount,
        bytes txArgs
    );

    constructor(address _swthToken, address _ccmProxyAddress, uint64 _counterpartChainId) public {
        require(_counterpartChainId > 0, "counterpartChainId cannot be zero");
        require(_ccmProxyAddress != address(0), "ccmProxyAddress cannot be empty");
        require(_swthToken != address(0), "swthToken cannot be empty");
        swthToken = _swthToken;
        counterpartChainId = _counterpartChainId;
        ccmProxy = CCMProxy(_ccmProxyAddress);
    }

    modifier onlyManagerContract() {
        require(
            msg.sender == ccmProxy.getEthCrossChainManager(),
            "msg.sender is not CCM"
        );
        _;
    }

    /// @dev Allow this contract to receive Ethereum
    receive() external payable {}

    /// @dev Allow this contract to receive ERC223 tokens
    /// An empty implementation is required so that the ERC223 token will not
    /// throw an error on transfer, this is specific to ERC223 tokens which
    /// require this implementation, e.g. DGTX
    function tokenFallback(address, uint, bytes calldata) external {}

    /// @dev Calculate the wallet address for the given owner and Switcheo TradeHub address
    /// @param _ownerAddress the Ethereum address which the user has control over, i.e. can sign msgs with
    /// @param _swthAddress the hex value of the user's Switcheo TradeHub address
    /// @param _bytecodeHash the hash of the wallet contract's bytecode
    /// @return the wallet address
    function getWalletAddress(
        address _ownerAddress,
        bytes calldata _swthAddress,
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

    /// @dev Create the wallet for the given owner and Switcheo TradeHub address
    /// @param _ownerAddress the Ethereum address which the user has control over, i.e. can sign msgs with
    /// @param _swthAddress the hex value of the user's Switcheo TradeHub address
    /// @return true if success
    function createWallet(
        address _ownerAddress,
        bytes calldata _swthAddress
    )
        external
        nonReentrant
        returns (bool)
    {
        require(_ownerAddress != address(0), "Empty ownerAddress");
        require(_swthAddress.length != 0, "Empty swthAddress");

        bytes32 salt = _getSalt(
            _ownerAddress,
            _swthAddress
        );

        Wallet wallet = new Wallet{salt: salt}();
        wallet.initialize(_ownerAddress, _swthAddress);
        wallets[address(wallet)] = true;

        return true;
    }

    /// @dev Add a contract as an extension
    /// @param _argsBz the serialized ExtensionTxArgs
    /// @param _fromChainId the originating chainId
    /// @return true if success
    function addExtension(
        bytes calldata _argsBz,
        bytes calldata /* _fromContractAddr */,
        uint64 _fromChainId
    )
        external
        onlyManagerContract
        nonReentrant
        returns (bool)
    {
        require(_fromChainId == counterpartChainId, "Invalid chain ID");

        ExtensionTxArgs memory args = _deserializeExtensionTxArgs(_argsBz);
        address extensionAddress = Utils.bytesToAddress(args.extensionAddress);
        extensions[extensionAddress] = true;

        return true;
    }

    /// @dev Remove a contract from the extensions mapping
    /// @param _argsBz the serialized ExtensionTxArgs
    /// @param _fromChainId the originating chainId
    /// @return true if success
    function removeExtension(
        bytes calldata _argsBz,
        bytes calldata /* _fromContractAddr */,
        uint64 _fromChainId
    )
        external
        onlyManagerContract
        nonReentrant
        returns (bool)
    {
        require(_fromChainId == counterpartChainId, "Invalid chain ID");

        ExtensionTxArgs memory args = _deserializeExtensionTxArgs(_argsBz);
        address extensionAddress = Utils.bytesToAddress(args.extensionAddress);
        extensions[extensionAddress] = false;

        return true;
    }

    /// @dev Marks an asset as registered by mapping the asset's address to
    /// the specified _fromContractAddr and assetHash on Switcheo TradeHub
    /// @param _argsBz the serialized RegisterAssetTxArgs
    /// @param _fromContractAddr the associated contract address on Switcheo TradeHub
    /// @param _fromChainId the originating chainId
    /// @return true if success
    function registerAsset(
        bytes calldata _argsBz,
        bytes calldata _fromContractAddr,
        uint64 _fromChainId
    )
        external
        onlyManagerContract
        nonReentrant
        returns (bool)
    {
        require(_fromChainId == counterpartChainId, "Invalid chain ID");

        RegisterAssetTxArgs memory args = _deserializeRegisterAssetTxArgs(_argsBz);
        _markAssetAsRegistered(
            Utils.bytesToAddress(args.nativeAssetHash),
            _fromContractAddr,
            args.assetHash
        );

        return true;
    }

    /// @dev Performs a deposit from a Wallet contract
    /// @param _walletAddress address of the wallet contract, the wallet contract
    /// does not receive ETH in this call, but _walletAddress still needs to be payable
    /// since the wallet contract can receive ETH, there would be compile errors otherwise
    /// @param _tokenAddress address of the asset to deposit
    /// @param _targetProxyHash the associated proxy hash on Switcheo TradeHub
    /// @param _toAssetHash the associated asset hash on Switcheo TradeHub
    /// @param _feeAddress the hex version of the Switcheo TradeHub address to send the fee to
    /// @param _values[0]: amount, the number of tokens to deposit
    /// @param _values[1]: feeAmount, the number of tokens to be used as fees
    /// @param _values[2]: nonce, to prevent replay attacks
    /// @param _values[3]: callAmount, some tokens may burn an amount before transfer
    /// so we allow a callAmount to support these tokens
    /// @param _v: the v value of the wallet owner's signature
    /// @param _rs: the r, s values of the wallet owner's signature
    function lockFromWallet(
        address payable _walletAddress,
        address _tokenAddress,
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
        require(wallets[_walletAddress], "Invalid wallet address");

        Wallet wallet = Wallet(_walletAddress);
        _validateLockFromWallet(
            wallet.owner(),
            _tokenAddress,
            _targetProxyHash,
            _toAssetHash,
            _feeAddress,
            _values,
            _v,
            _rs
        );

        // it is very important that this function validates the success of a transfer correctly
        // since, once this line is passed, the deposit is assumed to be successful
        // which will eventually result in the specified amount of tokens being minted for the
        // wallet.swthAddress on Switcheo TradeHub
        _transferInFromWallet(_walletAddress, _tokenAddress, _values[0], _values[3]);

        _lock(
            _tokenAddress,
            _targetProxyHash,
            _toAssetHash,
            wallet.owner(),
            wallet.swthAddress(),
            _values,
            _feeAddress
        );

        return true;
    }

    /// @dev Performs a deposit
    /// @param _tokenAddress the address of the token to deposit
    /// @param _targetProxyHash the associated proxy hash on Switcheo TradeHub
    /// @param _toAddress the hex version of the Switcheo TradeHub address to deposit to
    /// @param _toAssetHash the associated asset hash on Switcheo TradeHub
    /// @param _feeAddress the hex version of the Switcheo TradeHub address to send the fee to
    /// @param _values[0]: amount, the number of tokens to deposit
    /// @param _values[1]: feeAmount, the number of tokens to be used as fees
    /// @param _values[2]: callAmount, some tokens may burn an amount before transfer
    /// so we allow a callAmount to support these tokens
    function lock(
        address _tokenAddress,
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

        // it is very important that this function validates the success of a transfer correctly
        // since, once this line is passed, the deposit is assumed to be successful
        // which will eventually result in the specified amount of tokens being minted for the
        // _toAddress on Switcheo TradeHub
        _transferIn(_tokenAddress, _values[0], _values[2]);

        _lock(
            _tokenAddress,
            _targetProxyHash,
            _toAssetHash,
            msg.sender,
            _toAddress,
            _values,
            _feeAddress
        );

        return true;
    }

    /// @dev Performs a withdrawal that was initiated on Switcheo TradeHub
    /// @param _argsBz the serialized TransferTxArgs
    /// @param _fromContractAddr the associated contract address on Switcheo TradeHub
    /// @param _fromChainId the originating chainId
    /// @return true if success
    function unlock(
        bytes calldata _argsBz,
        bytes calldata _fromContractAddr,
        uint64 _fromChainId
    )
        external
        onlyManagerContract
        nonReentrant
        returns (bool)
    {
        require(_fromChainId == counterpartChainId, "Invalid chain ID");

        TransferTxArgs memory args = _deserializeTransferTxArgs(_argsBz);
        require(args.fromAssetHash.length > 0, "Invalid fromAssetHash");
        require(args.toAssetHash.length == 20, "Invalid toAssetHash");

        address tokenAddress = Utils.bytesToAddress(args.toAssetHash);
        address toAddress = Utils.bytesToAddress(args.toAddress);

        _validateAssetRegistration(tokenAddress, _fromContractAddr, args.fromAssetHash);
        _transferOut(toAddress, tokenAddress, args.amount);

        emit UnlockEvent(tokenAddress, toAddress, args.amount, _argsBz);
        return true;
    }

    /// @dev Performs a transfer of funds, this is only callable by approved extension contracts
    /// the `nonReentrant` guard is intentionally not added to this function, to allow for more flexibility.
    /// The calling contract should be secure and have its own `nonReentrant` guard as needed.
    /// @param _receivingAddress the address to transfer to
    /// @param _tokenAddress the address of the asset to transfer
    /// @param _amount the amount to transfer
    /// @return true if success
    function extensionTransfer(
        address _receivingAddress,
        address _tokenAddress,
        uint256 _amount
    )
        external
        returns (bool)
    {
        require(
            extensions[msg.sender] == true,
            "Invalid extension"
        );

        if (_tokenAddress == ETH_ADDRESS) {
            // we use `call` here since the _receivingAddress could be a contract
            // see https://diligence.consensys.net/blog/2019/09/stop-using-soliditys-transfer-now/
            // for more info
            (bool success,  ) = _receivingAddress.call{value: _amount}("");
            require(success, "Transfer failed");
            return true;
        }

        IERC20 token = IERC20(_tokenAddress);

        // Fixes possible issue when current allowance is not zero.
        // For more info see issue 3.2 in:
        // https://github.com/Switcheo/switcheo-tradehub-eth/blob/master/audits/PeckShield-Audit-Report-Switcheo-v1.0-rc.pdf
        uint256 allowance = token.allowance(address(this), _receivingAddress);
        if (allowance > 0) {
          _callOptionalReturn(
              token,
              abi.encodeWithSelector(
                  token.approve.selector,
                  _receivingAddress,
                  0
              )
          );
        }

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

    /// @dev Marks an asset as registered by associating it to a specified Switcheo TradeHub proxy and asset hash
    /// @param _tokenAddress the address of the asset to mark
    /// @param _proxyAddress the associated proxy address on Switcheo TradeHub
    /// @param _toAssetHash the associated asset hash on Switcheo TradeHub
    function _markAssetAsRegistered(
        address _tokenAddress,
        bytes memory _proxyAddress,
        bytes memory _toAssetHash
    )
        private
    {
        require(_proxyAddress.length == 20, "Invalid proxyAddress");
        require(
            registry[_tokenAddress] == bytes32(0),
            "Asset already registered"
        );

        bytes32 value = keccak256(abi.encodePacked(
            _proxyAddress,
            _toAssetHash
        ));

        registry[_tokenAddress] = value;
    }

    /// @dev Validates that an asset's registration matches the given params
    /// @param _tokenAddress the address of the asset to check
    /// @param _proxyAddress the expected proxy address on Switcheo TradeHub
    /// @param _toAssetHash the expected asset hash on Switcheo TradeHub
    function _validateAssetRegistration(
        address _tokenAddress,
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
        require(registry[_tokenAddress] == value, "Asset not registered");
    }

    /// @dev validates the asset registration and calls the CCM contract
    function _lock(
        address _tokenAddress,
        bytes memory _targetProxyHash,
        bytes memory _toAssetHash,
        address _fromAddress,
        bytes memory _toAddress,
        uint256[] memory _amounts, // 0: amount, 1: feeAmount (avoid StackTooDeep error)
        bytes memory _feeAddress
    )
        private
    {
        uint256 amount = _amounts[0];
        uint256 feeAmount = _amounts[1];
        require(_targetProxyHash.length == 20, "Invalid targetProxyHash");
        require(_toAssetHash.length > 0, "Empty toAssetHash");
        require(_toAddress.length > 0, "Empty toAddress");
        require(amount > 0, "Amount must be more than zero");
        require(feeAmount < amount, "Fee amount must be less than amount");

        _validateAssetRegistration(_tokenAddress, _targetProxyHash, _toAssetHash);

        TransferTxArgs memory txArgs = TransferTxArgs({
            fromAssetHash: Utils.addressToBytes(_tokenAddress),
            toAssetHash: _toAssetHash,
            fromAddress: abi.encodePacked(_fromAddress),
            toAddress: _toAddress,
            amount: amount,
            feeAmount: feeAmount,
            feeAddress: _feeAddress,
            nonce: _getNextNonce()
        });

        bytes memory txData = _serializeTransferTxArgs(txArgs);
        CCM ccm = _getCcm();
        require(
            ccm.crossChain(counterpartChainId, _targetProxyHash, "unlock", txData),
            "EthCrossChainManager crossChain executed error!"
        );

        emit LockEvent(_tokenAddress, _fromAddress, counterpartChainId, _toAssetHash, _toAddress, txData);
    }

    /// @dev validate the signature for lockFromWallet
    function _validateLockFromWallet(
        address _walletOwner,
        address _tokenAddress,
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
            _tokenAddress,
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

    /// @dev transfers funds from a Wallet contract into this contract
    /// the difference between this contract's before and after balance must equal _amount
    /// this is assumed to be sufficient in ensuring that the expected amount
    /// of funds were transferred in
    function _transferInFromWallet(
        address payable _walletAddress,
        address _tokenAddress,
        uint256 _amount,
        uint256 _callAmount
    )
        private
    {
        Wallet wallet = Wallet(_walletAddress);
        if (_tokenAddress == ETH_ADDRESS) {
            uint256 before = address(this).balance;

            wallet.sendETHToCreator(_callAmount);

            uint256 transferred = address(this).balance.sub(before);
            require(transferred == _amount, "ETH transferred does not match the expected amount");
            return;
        }

        IERC20 token = IERC20(_tokenAddress);
        uint256 before = token.balanceOf(address(this));

        wallet.sendERC20ToCreator(_tokenAddress, _callAmount);

        uint256 transferred = token.balanceOf(address(this)).sub(before);
        require(transferred == _amount || _tokenAddress == swthToken, "Tokens transferred does not match the expected amount");
    }

    /// @dev transfers funds from an address into this contract
    /// for ETH transfers, we only check that msg.value == _amount, and _callAmount is ignored
    /// for token transfers, the difference between this contract's before and after balance must equal _amount
    /// these checks are assumed to be sufficient in ensuring that the expected amount
    /// of funds were transferred in
    function _transferIn(
        address _tokenAddress,
        uint256 _amount,
        uint256 _callAmount
    )
        private
    {
        if (_tokenAddress == ETH_ADDRESS) {
            require(msg.value == _amount, "ETH transferred does not match the expected amount");
            return;
        }

        IERC20 token = IERC20(_tokenAddress);
        uint256 before = token.balanceOf(address(this));
        _callOptionalReturn(
            token,
            abi.encodeWithSelector(
                token.transferFrom.selector,
                msg.sender,
                address(this),
                _callAmount
            )
        );
        uint256 transferred = token.balanceOf(address(this)).sub(before);
        require(transferred == _amount || _tokenAddress == swthToken, "Tokens transferred does not match the expected amount");
    }

    /// @dev transfers funds from this contract to the _toAddress
    function _transferOut(
        address _toAddress,
        address _tokenAddress,
        uint256 _amount
    )
        private
    {
        if (_tokenAddress == ETH_ADDRESS) {
            // we use `call` here since the _receivingAddress could be a contract
            // see https://diligence.consensys.net/blog/2019/09/stop-using-soliditys-transfer-now/
            // for more info
            (bool success,  ) = _toAddress.call{value: _amount}("");
            require(success, "Transfer failed");
            return;
        }

        IERC20 token = IERC20(_tokenAddress);
        _callOptionalReturn(
            token,
            abi.encodeWithSelector(
                token.transfer.selector,
                _toAddress,
                _amount
            )
        );
    }

    /// @dev validates a signature against the specified user address
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
          _user != address(0),
          "Invalid signature"
        );

        require(
            _user == ecrecover(prefixedMessage, _v, _r, _s),
            "Invalid signature"
        );
    }

    function _serializeTransferTxArgs(TransferTxArgs memory args) private pure returns (bytes memory) {
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

    function _deserializeTransferTxArgs(bytes memory valueBz) private pure returns (TransferTxArgs memory) {
        TransferTxArgs memory args;
        uint256 off = 0;
        (args.fromAssetHash, off) = ZeroCopySource.NextVarBytes(valueBz, off);
        (args.toAssetHash, off) = ZeroCopySource.NextVarBytes(valueBz, off);
        (args.toAddress, off) = ZeroCopySource.NextVarBytes(valueBz, off);
        (args.amount, off) = ZeroCopySource.NextUint255(valueBz, off);
        return args;
    }

    function _deserializeRegisterAssetTxArgs(bytes memory valueBz) private pure returns (RegisterAssetTxArgs memory) {
        RegisterAssetTxArgs memory args;
        uint256 off = 0;
        (args.assetHash, off) = ZeroCopySource.NextVarBytes(valueBz, off);
        (args.nativeAssetHash, off) = ZeroCopySource.NextVarBytes(valueBz, off);
        return args;
    }

    function _deserializeExtensionTxArgs(bytes memory valueBz) private pure returns (ExtensionTxArgs memory) {
        ExtensionTxArgs memory args;
        uint256 off = 0;
        (args.extensionAddress, off) = ZeroCopySource.NextVarBytes(valueBz, off);
        return args;
    }

    function _getCcm() private view returns (CCM) {
      CCM ccm = CCM(ccmProxy.getEthCrossChainManager());
      return ccm;
    }

    function _getNextNonce() private returns (uint256) {
      currentNonce = currentNonce.add(1);
      return currentNonce;
    }

    function _getSalt(
        address _ownerAddress,
        bytes memory _swthAddress
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
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves.

        // A Solidity high level call has three parts:
        //  1. The target address is checked to verify it contains contract code
        //  2. The call itself is made, and success asserted
        //  3. The return value is decoded, which in turn checks the size of the returned data.
        // solhint-disable-next-line max-line-length
        require(Utils.isContract(address(token)), "SafeERC20: call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = address(token).call(data);
        require(success, "SafeERC20: low-level call failed");

        if (returndata.length > 0) { // Return data is optional
            // solhint-disable-next-line max-line-length
            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
        }
    }
}
