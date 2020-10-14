// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../libs/common/ZeroCopySink.sol";
import "../libs/utils/Utils.sol";

interface ILP {
    function registerAsset(bytes calldata _argsBs, bytes calldata _fromContractAddr, uint64 _fromChainId) external returns (bool);
}

contract CCMMock {
    struct RegisterAssetTxArgs {
        bytes assetHash;
        bytes nativeAssetHash;
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

    function registerAsset(
        address _lockProxyAddr,
        address _assetHash,
        bytes calldata _targetProxyHash,
        bytes calldata _toAssetHash,
        uint64 _chainId
    )
        external
    {
        RegisterAssetTxArgs memory txArgs = RegisterAssetTxArgs({
            assetHash: _toAssetHash,
            nativeAssetHash: Utils.addressToBytes(_assetHash)
        });

        bytes memory argsBs = _serializeRegisterAssetTxArgs(txArgs);
        ILP(_lockProxyAddr).registerAsset(argsBs, _targetProxyHash, _chainId);
    }

    function _serializeRegisterAssetTxArgs(RegisterAssetTxArgs memory args) internal pure returns (bytes memory) {
        bytes memory buff;
        buff = abi.encodePacked(
            ZeroCopySink.WriteVarBytes(args.assetHash),
            ZeroCopySink.WriteVarBytes(args.nativeAssetHash)
        );
        return buff;
    }
}
