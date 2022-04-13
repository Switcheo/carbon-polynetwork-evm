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
        uint256 lockType;
        bytes fromAssetAddress;
        bytes fromAssetDenom;
        bytes toAssetDenom;
        bytes fromAddress;
        bytes toAddress;
        uint256 amount;
        uint256 withdrawFeeAmount;
        bytes withdrawFeeAddress;
    }

    address public constant ETH_ASSET_HASH = address(0);

    ILockProxy public lockProxy;

    event LockEvent(
        address fromAssetAddress,
        uint64 toChainId,
        bytes fromAssetDenom,
        bytes fromAddress,
        bytes txArgs
    );

    constructor(address _lockProxy) {
        require(_lockProxy != address(0), "lockProxy cannot be empty");
        lockProxy = ILockProxy(_lockProxy);
    }

    /// @dev Performs a deposit
    /// @param _assetHash the asset to deposit
    /// @param _bytesValues[0]: _targetProxyHash the associated proxy hash on Switcheo TradeHub
    /// @param _bytesValues[1]: _fromAddress the hex version of the Switcheo TradeHub address to deposit to
    /// @param _bytesValues[2]: _fromAssetDenom the associated asset hash on Switcheo TradeHub
    /// @param _bytesValues[3]: _withdrawFeeAddress the hex version of the Switcheo TradeHub address to send the fee to
    /// @param _uint256Values[0]: _lockType: deposit, bridge
    /// @param _uint256Values[1]: amount, the number of tokens to deposit
    /// @param _uint256Values[2]: withdrawFeeAmount, the number of tokens to be used as fees
    /// @param _uint256Values[3]: callAmount, some tokens may burn an amount before transfer
    /// so we allow a callAmount to support these tokens
    function lock(
        address _assetHash,
        bytes[] calldata _bytesValues,
        uint256[] calldata _uint256Values
    )
        external
        payable
        nonReentrant
        returns (bool)
    {
        // bytes memory _targetProxyHash = _bytesValues[0];
        // bytes memory _fromAddress = _bytesValues[1];
        // bytes memory _fromAssetDenom = _bytesValues[2];
        // bytes memory _withdrawFeeAddress = _bytesValues[3];
        // bytes memory _toAddress = _bytesValues[4];
        // bytes memory _toAssetDenom = _bytesValues[5];

        // it is very important that this function validates the success of a transfer correctly
        // since, once this line is passed, the deposit is assumed to be successful
        // which will eventually result in the specified amount of tokens being minted for the
        // _fromAddress on Switcheo TradeHub
        _transferIn(_assetHash, _uint256Values[1], _uint256Values[3]);

        _lock(_assetHash, _bytesValues, _uint256Values);

        return true;
    }

    /// @dev Validates that an asset's registration matches the given params
    /// @param _assetHash the address of the asset to check
    /// @param _proxyAddress the expected proxy address on Switcheo TradeHub
    /// @param _fromAssetDenom the expected asset hash on Switcheo TradeHub
    function _validateAssetRegistration(
        address _assetHash,
        bytes memory _proxyAddress,
        bytes memory _fromAssetDenom
    )
        private
        view
    {
        require(_proxyAddress.length == 20, "Invalid proxyAddress");
        bytes32 value = keccak256(abi.encodePacked(
            _proxyAddress,
            _fromAssetDenom
        ));
        require(lockProxy.registry(_assetHash) == value, "Asset not registered");
    }

    /// @dev validates the asset registration and calls the CCM contract
    /// @param _bytesValues[0]: _targetProxyHash the associated proxy hash on Switcheo TradeHub
    /// @param _bytesValues[1]: _fromAddress the hex version of the Switcheo TradeHub address to deposit to
    /// @param _bytesValues[2]: _fromAssetDenom the associated asset hash on Switcheo TradeHub
    /// @param _bytesValues[3]: _withdrawFeeAddress the hex version of the Switcheo TradeHub address to send the fee to
    /// @param _uint256Values[0]: _lockType: deposit, bridge
    /// @param _uint256Values[1]: _amount, the number of tokens to deposit
    /// @param _uint256Values[2]: _withdrawFeeAmount, the number of tokens to be used as fees
    function _lock(
        address _fromAssetAddress,
        bytes[] calldata _bytesValues,
        uint256[] calldata _uint256Values
    )
        private
    {
        bytes memory _targetProxyHash = _bytesValues[0];
        bytes memory _fromAddress = _bytesValues[1];
        bytes memory _fromAssetDenom = _bytesValues[2];
        // bytes memory _withdrawFeeAddress = _bytesValues[3];
        // bytes memory _toAddress = _bytesValues[4];
        // bytes memory _toAssetDenom = _bytesValues[5];

        // uint256 _lockType = _uint256Values[0];
        uint256 _amount = _uint256Values[1];
        uint256 _withdrawFeeAmount = _uint256Values[2];

        require(_targetProxyHash.length == 20, "Invalid targetProxyHash");
        require(_fromAssetDenom.length > 0, "Empty fromAssetDenom");
        require(_fromAddress.length > 0, "Empty fromAddress");
        // TODO: validations for new params
        require(_amount > 0, "Amount must be more than zero");
        require(_withdrawFeeAmount < _amount, "Fee amount cannot be greater than amount");

        _validateAssetRegistration(_fromAssetAddress, _targetProxyHash, _fromAssetDenom);

        TransferTxArgs memory txArgs = TransferTxArgs({
            lockType: _uint256Values[0],
            fromAssetAddress: Utils.addressToBytes(_fromAssetAddress),
            fromAssetDenom: _fromAssetDenom,
            toAssetDenom: _bytesValues[5],
            fromAddress: _fromAddress,
            toAddress: _bytesValues[4],
            amount: _amount,
            withdrawFeeAmount: _withdrawFeeAmount,
            withdrawFeeAddress: _bytesValues[3]
        });

        bytes memory txData = _serializeTransferTxArgs(txArgs);
        ICCM ccm = _getCcm();
        uint64 counterpartChainId = lockProxy.counterpartChainId();
        require(
            ccm.crossChain(counterpartChainId, _targetProxyHash, "unlock", txData),
            "EthCrossChainManager crossChain executed error!"
        );

        emit LockEvent(_fromAssetAddress, counterpartChainId, _fromAssetDenom, _fromAddress, txData);
    }

    function _getCcm() private view returns (ICCM) {
      ICCMProxy ccmProxy = lockProxy.ccmProxy();
      ICCM ccm = ICCM(ccmProxy.getEthCrossChainManager());
      return ccm;
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
            (bool sent,) = address(lockProxy).call{value: msg.value}("");
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
            ZeroCopySink.WriteUint255(args.lockType),
            ZeroCopySink.WriteVarBytes(args.fromAssetAddress),
            ZeroCopySink.WriteVarBytes(args.fromAssetDenom),
            ZeroCopySink.WriteVarBytes(args.toAssetDenom),
            ZeroCopySink.WriteVarBytes(args.fromAddress),
            ZeroCopySink.WriteVarBytes(args.toAddress),
            ZeroCopySink.WriteUint255(args.amount),
            ZeroCopySink.WriteUint255(args.withdrawFeeAmount),
            ZeroCopySink.WriteVarBytes(args.withdrawFeeAddress)
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
