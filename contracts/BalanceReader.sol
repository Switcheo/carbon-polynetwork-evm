// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./libs/math/SafeMath.sol";

interface ERC20 {
    function balanceOf(address account) external view returns (uint256);
}

contract BalanceReader {
    using SafeMath for uint256;

    address private constant ETH_ASSET_HASH = address(0);

    function getBalances(
        address _user,
        address[] memory _assetIds
    )
        public
        view
        returns (uint256[] memory)
    {
        uint256[] memory balances = new uint256[](_assetIds.length);

        for (uint256 i = 0; i < _assetIds.length; i++) {
            if (_assetIds[i] == ETH_ASSET_HASH) {
                balances[i] = _user.balance;
                continue;
            }
            if (!_isContract(_assetIds[i])) {
                continue;
            }

            ERC20 token = ERC20(_assetIds[i]);
            balances[i] = token.balanceOf(_user);
        }

        return balances;
    }

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
