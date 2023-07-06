//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./libsv2/common/ZeroCopySink.sol";
import "./libsv2/utils/Utils.sol";

interface ICCM {
    function crossChain(
        uint64 _toChainId,
        bytes calldata _toContract,
        bytes calldata _method,
        bytes calldata _txData
    ) external returns (bool);
}

interface ICCMProxy {
    function getEthCrossChainManager() external view returns (address);
}

interface ILockProxy {
    function registry(address _assetHash) external view returns (bytes32);

    function ccmProxy() external view returns (ICCMProxy);

    function counterpartChainId() external view returns (uint64);
}

contract FLUODepositerTest is ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // used for cross-chain lock and unlock methods
    struct TransferTxArgs {
        bytes fromAssetAddress;
        bytes toAssetHash;
        bytes recoveryAddress;
        bytes fromAddress;
        bytes fromPubKeySig;
        bool isLongUnbond;
        uint256 amount;
        uint256 withdrawFeeAmount;
        uint256 depositPoolId;
        uint256 bonusVaultId;
        bytes fluoDistributorAddress;
        bytes bonusFLUODistributorAddress;
        bytes withdrawFeeAddress;
    }

    address public constant USDC_ASSET_HASH = address(0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8);

    ILockProxy public lockProxy;

    event LockEvent(
        address fromAssetAddress,
        uint64 toChainId,
        bytes fromAssetDenom,
        bytes recoveryAddress,
        bytes txArgs
    );

    constructor(address _lockProxy) {
        require(_lockProxy != address(0), "lockProxy cannot be empty");
        lockProxy = ILockProxy(_lockProxy);
    }

    /// @dev Performs a deposit
    /// @param _assetHash the asset to deposit
    /// @param _bytesValues[0]: _targetProxyHash the associated proxy hash on Switcheo Carbon
    /// @param _bytesValues[1]: _recoveryAddress the hex version of the Switcheo Carbon recovery address to deposit to
    /// @param _bytesValues[2]: _toAssetHash the associated asset hash on Switcheo Carbon
    /// @param _bytesValues[3]: _withdrawFeeAddress the hex version of the Switcheo Carbon address to send the fee to
    /// @param _bytesValues[4]: _fromPubKey the associated public key of the msg.sender
    /// @param _bytesValues[5]: _fromPubKeySig the signature of the msg sender's public key
    /// @param _bytesValues[6]: _fluoDistributorAddress the address of the FLUODistributor contract on carbon evm
    /// @param _bytesValues[7]: _bonusFLUODistributorAddress the address of the BonusFLUODistributor contract on carbon evm
    /// @param _uint256Values[0]: amount, the number of tokens to deposit
    /// @param _uint256Values[1]: withdrawFeeAmount, the number of tokens to be used as fees
    /// @param _uint256Values[2]: callAmount, some tokens may burn an amount before transfer so we allow a callAmount to support these tokens
    /// @param _uint256Values[3]: depositPoolId, the pool id to deposit to
    /// @param _uint256Values[4]: bonusVaultId, the vault id to deposit to
    /// @param _isLongUnbond: whether the deposit is for long unbond
    function lock(
        address _assetHash,
        bytes[] calldata _bytesValues,
        uint256[] calldata _uint256Values,
        bool _isLongUnbond
    ) external payable nonReentrant returns (bool) {
        _lock(_assetHash, _bytesValues, _uint256Values, _isLongUnbond);

        return true;
    }

    /// @dev validates the asset registration and calls the CCM contract
    /// @param _fromAssetAddress the asset to deposit
    /// @param _bytesValues[0]: _targetProxyHash the associated proxy hash on Switcheo Carbon
    /// @param _bytesValues[1]: _recoveryAddress the hex version of the Switcheo Carbon recovery address to deposit to
    /// @param _bytesValues[2]: _toAssetHash the associated asset hash on Switcheo Carbon
    /// @param _bytesValues[3]: _withdrawFeeAddress the hex version of the Switcheo Carbon address to send the fee to
    /// @param _bytesValues[4]: _fromPubKey the associated public key of the msg.sender
    /// @param _bytesValues[5]: _fromPubKeySig the signature of the msg sender's public key
    /// @param _bytesValues[6]: _fluoDistributorAddress the address of the FLUODistributor contract on carbon evm
    /// @param _bytesValues[7]: _bonusFLUODistributorAddress the address of the BonusFLUODistributor contract on carbon evm
    /// @param _uint256Values[0]: amount, the number of tokens to deposit
    /// @param _uint256Values[1]: withdrawFeeAmount, the number of tokens to be used as fees
    /// @param _uint256Values[2]: callAmount, some tokens may burn an amount before transfer
    /// @param _uint256Values[3]: depositPoolId, the pool id to deposit to
    /// @param _uint256Values[4]: bonusVaultId, the vault id to deposit to
    /// @param _isLongUnbond: whether the deposit is for long unbond
    function _lock(
        address _fromAssetAddress,
        bytes[] calldata _bytesValues,
        uint256[] calldata _uint256Values,
        bool _isLongUnbond
    ) private {
        require(
            address(bytes20(uint160(uint256(keccak256(_bytesValues[4]))))) == address(msg.sender),
            "Public key does not match msg.sender"
        );
        TransferTxArgs memory txArgs;
        {
            txArgs.fromAssetAddress = Utils.addressToBytes(_fromAssetAddress);
            txArgs.toAssetHash = _bytesValues[2];
            txArgs.recoveryAddress = _bytesValues[1];
            txArgs.fromAddress = _bytesValues[4];
            txArgs.amount = _uint256Values[0];
            txArgs.withdrawFeeAmount = _uint256Values[1];
            txArgs.withdrawFeeAddress = _bytesValues[3];
        }
        {
            txArgs.fromPubKeySig = _bytesValues[5];
            txArgs.isLongUnbond = _isLongUnbond;
            txArgs.depositPoolId = _uint256Values[3];
            txArgs.fluoDistributorAddress = _bytesValues[6];
            txArgs.bonusFLUODistributorAddress = _bytesValues[7];
            txArgs.bonusVaultId = _uint256Values[4];
        }

        bytes memory txData = _serializeTransferTxArgs(txArgs);
        emit LockEvent(_fromAssetAddress, 5, _bytesValues[2], _bytesValues[1], txData);
    }

    function _serializeTransferTxArgs(TransferTxArgs memory args) private pure returns (bytes memory) {
        bytes memory buff1;
        bytes memory buff2;
        {
            buff1 = abi.encodePacked(
                ZeroCopySink.WriteVarBytes(args.fromAssetAddress),
                ZeroCopySink.WriteVarBytes(args.toAssetHash),
                ZeroCopySink.WriteVarBytes(args.recoveryAddress),
                ZeroCopySink.WriteVarBytes(args.fromAddress),
                ZeroCopySink.WriteVarBytes(args.fromPubKeySig),
                ZeroCopySink.WriteVarBytes(args.fluoDistributorAddress),
                ZeroCopySink.WriteVarBytes(args.bonusFLUODistributorAddress)
            );
        }
        {
            buff2 = abi.encodePacked(
                ZeroCopySink.WriteUint255(args.withdrawFeeAmount),
                ZeroCopySink.WriteUint255(args.amount),
                ZeroCopySink.WriteUint255(args.depositPoolId),
                ZeroCopySink.WriteUint255(args.bonusVaultId),
                ZeroCopySink.WriteBool(args.isLongUnbond),
                ZeroCopySink.WriteVarBytes(args.withdrawFeeAddress)
            );
        }
        bytes memory buff = abi.encodePacked(buff1, buff2);
        return buff;
    }
}
