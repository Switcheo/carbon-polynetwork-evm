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

contract FLUODepositer is ReentrancyGuard {
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

    address public immutable USDC_ASSET_HASH;

    ILockProxy public lockProxy;

    event LockEvent(
        address fromAssetAddress,
        uint64 toChainId,
        bytes fromAssetDenom,
        bytes recoveryAddress,
        bytes txArgs
    );

    constructor(address _lockProxy, address _USDC_ASSET_HASH) {
        require(_lockProxy != address(0), "lockProxy cannot be empty");
        lockProxy = ILockProxy(_lockProxy);
        USDC_ASSET_HASH = _USDC_ASSET_HASH;
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
        // it is very important that this function validates the success of a transfer correctly
        // since, once this line is passed, the deposit is assumed to be successful
        // which will eventually result in the specified amount of tokens being minted for the
        // _recoveryAddress on Switcheo Carbon
        _transferIn(_assetHash, _uint256Values[0], _uint256Values[2]);

        _lock(_assetHash, _bytesValues, _uint256Values, _isLongUnbond);

        return true;
    }

    /// @dev Validates that an asset's registration matches the given params
    /// @param _assetHash the address of the asset to check
    /// @param _proxyAddress the expected proxy address on Switcheo Carbon
    /// @param _fromAssetDenom the expected asset hash on Switcheo Carbon
    function _validateAssetRegistration(
        address _assetHash,
        bytes memory _proxyAddress,
        bytes memory _fromAssetDenom
    ) private view {
        require(_proxyAddress.length == 20, "Invalid proxyAddress");
        bytes32 value = keccak256(
            abi.encodePacked(_proxyAddress, _fromAssetDenom)
        );
        require(
            lockProxy.registry(_assetHash) == value,
            "Asset not registered"
        );
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
        require(_bytesValues[0].length == 20, "Invalid targetProxyHash");
        require(_bytesValues[2].length > 0, "Empty fromAssetDenom");
        require(_bytesValues[1].length > 0, "Empty recoveryAddress");
        require(_uint256Values[0] > 0, "Amount must be more than zero");
        require(
            _uint256Values[1] < _uint256Values[0],
            "Fee amount cannot be greater than amount"
        );
        require(_bytesValues[6].length == 20, "Invalid fluoDistributorAddress");
        require(
            _bytesValues[7].length == 20,
            "Invalid bonusFLUODistributorAddress"
        );
        require(
            address(bytes20(uint160(uint256(keccak256(_bytesValues[4]))))) ==
                address(msg.sender),
            "Public key does not match msg.sender"
        );

        _validateAssetRegistration(
            _fromAssetAddress,
            _bytesValues[0],
            _bytesValues[2]
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
        ICCM ccm = _getCcm();
        uint64 counterpartChainId = lockProxy.counterpartChainId();
        require(
            ccm.crossChain(
                counterpartChainId,
                _bytesValues[0],
                "unlock",
                txData
            ),
            "EthCrossChainManager crossChain executed error!"
        );

        emit LockEvent(
            _fromAssetAddress,
            counterpartChainId,
            _bytesValues[2],
            _bytesValues[1],
            txData
        );
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
    ) private {
        require(
            _assetHash == USDC_ASSET_HASH,
            "Tokens transferred is not arbitrum USDC"
        );

        IERC20 token = IERC20(_assetHash);
        uint256 before = token.balanceOf(address(lockProxy));
        token.safeTransferFrom(msg.sender, address(lockProxy), _callAmount);
        uint256 transferred = token.balanceOf(address(lockProxy)).sub(before);
        require(
            transferred == _amount,
            "Tokens transferred does not match the expected amount"
        );
    }

    function _serializeTransferTxArgs(
        TransferTxArgs memory args
    ) private pure returns (bytes memory) {
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
