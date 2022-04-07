//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

// import "hardhat/console.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./libsv2/common/ZeroCopySink.sol";
import "./libsv2/utils/Utils.sol";

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface ICCM {
    function crossChain(uint64 _toChainId, bytes calldata _toContract, bytes calldata _method, bytes calldata _txData) external returns (bool);
}

interface ICCMProxy {
    function getEthCrossChainManager() external view returns (address);
}

interface ILockProxy {
    function registry(address _assetHash) external view returns (bytes32);
    function ccmProxy() external view returns (ICCMProxy);
    function counterpartChainId() external view returns (uint64);
}

contract BridgeEntrance is ReentrancyGuard {
    using SafeMath for uint256;

    // used for cross-chain lock and unlock methods
    struct TransferTxArgs {
        bytes fromAssetHash;
        bytes toAssetHash;
        bytes toAddress;
        uint256 amount;
        uint256 feeAmount;
        bytes feeAddress;
        bytes fromAddress;
        uint256 nonce;
    }

    address public constant ETH_ASSET_HASH = address(0);

    ILockProxy public lockProxy;
    uint256 public currentNonce = 0; // TODO: delete me

    event LockEvent(
        address fromAssetHash,
        address fromAddress,
        uint64 toChainId,
        bytes toAssetHash,
        bytes toAddress,
        bytes txArgs
    );

    constructor(address _lockProxy) {
        require(_lockProxy != address(0), "lockProxy cannot be empty");
        lockProxy = ILockProxy(_lockProxy);
    }

    /// @dev Performs a deposit
    /// @param _assetHash the asset to deposit
    /// @param _targetProxyHash the associated proxy hash on Switcheo TradeHub
    /// @param _toAddress the hex version of the Switcheo TradeHub address to deposit to
    /// @param _toAssetHash the associated asset hash on Switcheo TradeHub
    /// @param _feeAddress the hex version of the Switcheo TradeHub address to send the fee to
    /// @param _values[0]: amount, the number of tokens to deposit
    /// @param _values[1]: feeAmount, the number of tokens to be used as fees
    /// @param _values[2]: callAmount, some tokens may burn an amount before transfer
    /// so we allow a callAmount to support these tokens
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

        // it is very important that this function validates the success of a transfer correctly
        // since, once this line is passed, the deposit is assumed to be successful
        // which will eventually result in the specified amount of tokens being minted for the
        // _toAddress on Switcheo TradeHub
        _transferIn(_assetHash, _values[0], _values[2]);

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

    /// @dev Validates that an asset's registration matches the given params
    /// @param _assetHash the address of the asset to check
    /// @param _proxyAddress the expected proxy address on Switcheo TradeHub
    /// @param _toAssetHash the expected asset hash on Switcheo TradeHub
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
        require(lockProxy.registry(_assetHash) == value, "Asset not registered");
    }

    /// @dev validates the asset registration and calls the CCM contract
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
        require(_targetProxyHash.length == 20, "Invalid targetProxyHash");
        require(_toAssetHash.length > 0, "Empty toAssetHash");
        require(_toAddress.length > 0, "Empty toAddress");
        require(_amount > 0, "Amount must be more than zero");
        require(_feeAmount < _amount, "Fee amount cannot be greater than amount");

        _validateAssetRegistration(_fromAssetHash, _targetProxyHash, _toAssetHash);

        TransferTxArgs memory txArgs = TransferTxArgs({
            fromAssetHash: Utils.addressToBytes(_fromAssetHash),
            toAssetHash: _toAssetHash,
            toAddress: _toAddress,
            amount: _amount,
            feeAmount: _feeAmount,
            feeAddress: _feeAddress,
            fromAddress: abi.encodePacked(msg.sender),
            nonce: _getNextNonce()
        });

        bytes memory txData = _serializeTransferTxArgs(txArgs);
        ICCM ccm = _getCcm();
        uint64 counterpartChainId = lockProxy.counterpartChainId();
        require(
            ccm.crossChain(counterpartChainId, _targetProxyHash, "unlock", txData),
            "EthCrossChainManager crossChain executed error!"
        );

        emit LockEvent(_fromAssetHash, msg.sender, counterpartChainId, _toAssetHash, _toAddress, txData);
    }

    function _getCcm() private view returns (ICCM) {
      ICCMProxy ccmProxy = lockProxy.ccmProxy();
      ICCM ccm = ICCM(ccmProxy.getEthCrossChainManager());
      return ccm;
    }

    function _getNextNonce() private returns (uint256) {
      currentNonce = currentNonce.add(1);
      return currentNonce;
    }

    /// @dev transfers funds from an address into this contract
    /// for ETH transfers, we only check that msg.value == _amount, and _callAmount is ignored
    /// for token transfers, the difference between this contract's before and after balance must equal _amount
    /// these checks are assumed to be sufficient in ensuring that the expected amount
    /// of funds were transferred in
    function _transferIn(
        address _assetHash,
        uint256 _amount,
        uint256 _callAmount
    )
        private
    {
        if (_assetHash == ETH_ASSET_HASH) {
            require(msg.value == _amount, "ETH transferred does not match the expected amount");
            (bool sent, bytes memory data) = address(lockProxy).call{value: msg.value}("");
            require(sent, "Failed to send Ether to LockProxy");
            return;
        }

        IERC20 token = IERC20(_assetHash);
        uint256 before = token.balanceOf(address(lockProxy));
        _callOptionalReturn(
            token,
            abi.encodeWithSelector(
                token.transferFrom.selector,
                msg.sender,
                address(lockProxy),
                _callAmount
            )
        );
        uint256 transferred = token.balanceOf(address(lockProxy)).sub(before);
        require(transferred == _amount, "Tokens transferred does not match the expected amount");
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
