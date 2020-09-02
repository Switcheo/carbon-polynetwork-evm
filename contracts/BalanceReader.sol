pragma solidity 0.6.12;

import "./libs/math/SafeMath.sol";

interface ERC20 {
    function balanceOf(address account) external view returns (uint256);
}

contract BalanceReader {
    using SafeMath for uint256;

    address private constant ETHER_ADDR = address(0);

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
            if (_assetIds[i] == ETHER_ADDR) {
                balances[i] = _user.balance;
                continue;
            }
            ERC20 token = ERC20(_assetIds[i]);
            balances[i] = token.balanceOf(_user);
        }

        return balances;
    }
}
