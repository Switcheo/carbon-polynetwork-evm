// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../libs/token/ERC20/ERC20.sol";
import "../libs/token/ERC20/ERC20Detailed.sol";
import "../libs/math/SafeMath.sol";

/**
* @title SWTH Coin - Standard ERC20 token
*
* @dev Implementation of the basic standard token.
* https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
*/
contract SWTHCoin is ERC20, ERC20Detailed {
  using SafeMath for uint256;

  address lockProxyAddress;

  constructor(address _lockProxyAddress) ERC20Detailed("Switcheo Coin", "SWTH", 18) public {
    lockProxyAddress = _lockProxyAddress;
  }

  function mint(address account, uint256 amount) public returns (bool) {
      _mint(account, amount);
      return true;
  }

  function burn(address account, uint256 amount) public returns (bool) {
      _burn(account, amount);
      return true;
  }

  function transfer(address recipient, uint256 amount) public override returns (bool) {
    // lockProxy should not be sender and recipient
    require(!(msg.sender == lockProxyAddress && recipient == lockProxyAddress));

    if (msg.sender == lockProxyAddress) {
      _mint(msg.sender, amount);
    }

    _transfer(msg.sender, recipient, amount);

    if (recipient == lockProxyAddress) {
        _burn(recipient, amount);
    }

    return true;
  }

  function getLockProxyAddress() public view returns (address) {
    return lockProxyAddress;
  }
}
