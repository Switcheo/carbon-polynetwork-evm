// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./libs/token/ERC20/IERC20.sol";
import "./libs/math/SafeMath.sol";
import "./libs/utils/Utils.sol";

contract BalanceReader {
    using SafeMath for uint256;

    address private constant ETH_ADDRESS = address(0);

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
            if (_assetIds[i] == ETH_ADDRESS) {
                balances[i] = _user.balance;
                continue;
            }
            if (!Utils.isContract(_assetIds[i])) {
                continue;
            }

            IERC20 token = IERC20(_assetIds[i]);
            balances[i] = token.balanceOf(_user);
        }

        return balances;
    }
}
