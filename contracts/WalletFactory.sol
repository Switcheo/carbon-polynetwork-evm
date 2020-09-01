pragma solidity 0.6.5;

import "./Wallet.sol";

contract WalletFactory {
    bytes public constant SALT_PREFIX = "switcheo-eth-wallet-factory-v1";

    function getWalletAddress(
        address _owner,
        string memory _externalAddress,
        uint64 _targetChainId,
        bytes32 _bytecodeHash
    )
        public
        view
        returns (address)
    {
        bytes32 salt = getSalt(
            _owner,
            _externalAddress,
            _targetChainId
        );

        bytes32 data = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, _bytecodeHash)
        );

        return address(bytes20(data << 96));
    }

    function getSalt(
        address _owner,
        string memory _externalAddress,
        uint64 _targetChainId
    )
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(
            SALT_PREFIX,
            _owner,
            _externalAddress,
            _targetChainId
        ));
    }

    function createWallet(
        address _owner,
        string calldata _externalAddress,
        uint64 _targetChainId
    )
        external
        returns (bool)
    {
        require(_owner != address(0), "Empty nativeAddress");
        require(bytes(_externalAddress).length != 0, "Empty externalAddress");
        require(_targetChainId != 0, "Empty targetChainId");

        bytes32 salt = getSalt(
            _owner,
            _externalAddress,
            _targetChainId
        );

        Wallet wallet = new Wallet{salt: salt}();
        wallet.initialize(_owner, _externalAddress, _targetChainId);

        return true;
    }
}
