// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../libs/token/ERC20/IERC20.sol";
import "../libs/token/ERC20/ERC20.sol";
import "../libs/token/ERC20/ERC20Detailed.sol";
import "../libs/ownership/Ownable.sol";
import "../libs/math/SafeMath.sol";

/**
* @title CarbonWrappedERC20 - Carbon Wrapped ERC20 Token
*
* @dev Standard ERC20 that mints / burns to the PoS lockProxy
* contract.
* https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
*/
abstract contract CarbonWrappedERC20 is ERC20, Ownable {
  using SafeMath for uint256;

  address public lockProxyAddress;

  constructor(address _lockProxyAddress) public {
    lockProxyAddress = _lockProxyAddress;
  }

  function _transfer(address sender, address recipient, uint256 amount) internal override {
    if (sender == lockProxyAddress) {
      require(recipient != lockProxyAddress, "CarbonWrappedERC20: lockProxy should not call transfer to self");
      // lockProxy is the primary minter - so mint whenever required.
      uint256 balance = balanceOf(lockProxyAddress);
      if (balance < amount) {
        _mint(lockProxyAddress, amount.sub(balance));
      }
    }

    super._transfer(sender, recipient, amount);
  }

  function circulatingSupply() external view returns (uint256 amount) {
    return totalSupply().sub(balanceOf(lockProxyAddress));
  }

  function burnLocked() public onlyOwner {
    uint256 balance = balanceOf(lockProxyAddress);
    _burn(lockProxyAddress, balance);
  }
}
