// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../libs/common/ZeroCopySink.sol";
import "../libs/utils/Utils.sol";

interface ILockProxy {
    function addExtension(bytes calldata _argsBs, bytes calldata _fromContractAddr, uint64 _fromChainId) external returns (bool);
    function removeExtension(bytes calldata _argsBs, bytes calldata _fromContractAddr, uint64 _fromChainId) external returns (bool);
    function registerAsset(bytes calldata _argsBs, bytes calldata _fromContractAddr, uint64 _fromChainId) external returns (bool);
    function unlock(bytes calldata _argsBs, bytes calldata _fromContractAddr, uint64 _fromChainId) external returns (bool);
}

contract CCMMock {
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

    event CrossChainEvent(
        uint64 toChainId,
        bytes toContract,
        bytes method,
        bytes txData
    );

    function crossChain(
        uint64 _toChainId,
        bytes calldata _toContract,
        bytes calldata _method,
        bytes calldata _txData
    )
        external
        returns (bool)
    {
        emit CrossChainEvent(_toChainId, _toContract, _method, _txData);
        return true;
    }

    function addExtension(
        address _lockProxyAddr,
        address _extension,
        uint64 _chainId
    )
        external
    {
        ExtensionTxArgs memory txArgs = ExtensionTxArgs({
            extensionAddress: Utils.addressToBytes(_extension)
        });

        bytes memory argsBz = _serializeExtensionTxArgs(txArgs);
        ILockProxy(_lockProxyAddr).addExtension(argsBz, "", _chainId);
    }

    function removeExtension(
        address _lockProxyAddr,
        address _extension,
        uint64 _chainId
    )
        external
    {
        ExtensionTxArgs memory txArgs = ExtensionTxArgs({
            extensionAddress: Utils.addressToBytes(_extension)
        });

        bytes memory argsBz = _serializeExtensionTxArgs(txArgs);
        ILockProxy(_lockProxyAddr).removeExtension(argsBz, "", _chainId);
    }

    function registerAsset(
        address _lockProxyAddr,
        address _assetHash,
        bytes calldata _fromProxyHash,
        bytes calldata _toAssetHash,
        uint64 _chainId
    )
        external
    {
        RegisterAssetTxArgs memory txArgs = RegisterAssetTxArgs({
            assetHash: _toAssetHash,
            nativeAssetHash: Utils.addressToBytes(_assetHash)
        });

        bytes memory argsBz = _serializeRegisterAssetTxArgs(txArgs);
        ILockProxy(_lockProxyAddr).registerAsset(argsBz, _fromProxyHash, _chainId);
    }

    function unlock(
        address _lockProxyAddr,
        bytes calldata _fromProxyHash,
        bytes calldata _fromAssetHash,
        address _toAssetHash,
        address _toAddress,
        uint256 _amount,
        uint64 _chainId
    )
        external
    {
        TxArgs memory txArgs = TxArgs({
            fromAssetHash: _fromAssetHash,
            toAssetHash: Utils.addressToBytes(_toAssetHash),
            toAddress: Utils.addressToBytes(_toAddress),
            amount: _amount,
            feeAmount: 0,
            feeAddress: "",
            fromAddress: "",
            nonce: 1
        });

        bytes memory argsBz = _serializeTxArgs(txArgs);
        ILockProxy(_lockProxyAddr).unlock(argsBz, _fromProxyHash, _chainId);
    }

    function _serializeExtensionTxArgs(ExtensionTxArgs memory args) private pure returns (bytes memory) {
        bytes memory buff;
        buff = abi.encodePacked(
            ZeroCopySink.WriteVarBytes(args.extensionAddress)
        );
        return buff;
    }

    function _serializeRegisterAssetTxArgs(RegisterAssetTxArgs memory args) private pure returns (bytes memory) {
        bytes memory buff;
        buff = abi.encodePacked(
            ZeroCopySink.WriteVarBytes(args.assetHash),
            ZeroCopySink.WriteVarBytes(args.nativeAssetHash)
        );
        return buff;
    }

    function _serializeTxArgs(TxArgs memory args) private pure returns (bytes memory) {
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
}
