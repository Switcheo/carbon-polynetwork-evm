// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../libs/token/ERC20/ERC20.sol";
import "../libs/token/ERC20/ERC20Detailed.sol";
import "../libs/ownership/Ownable.sol";
import "../libs/math/SafeMath.sol";

/**
* @title SwitcheoTokenModifiable - Standard ERC20 token
* with ability for owner to add multiple lock proxies.
* @dev Implementation of the basic standard token.
* https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
*/
contract SwitcheoTokenModifiable is ERC20, ERC20Detailed, Ownable {
  using SafeMath for uint256;

  mapping(address => bool) lockProxyAddresses;

  constructor() ERC20Detailed("Switcheo Token", "SWTH", 8) public {}

  function addLockProxy(address _lockProxyAddress) public onlyOwner {
      require(!lockProxyAddresses[_lockProxyAddress], "SwitcheoToken: already added lockproxy");
      lockProxyAddresses[_lockProxyAddress] = true;
  }

  function _transfer(address sender, address recipient, uint256 amount) internal override {
      if (lockProxyAddresses[sender]) {
          require(!lockProxyAddresses[recipient], "SwitcheoToken: lockProxy should not call transfer to self");
          _mint(sender, amount); // lockProxy is the primary minter
      }

      super._transfer(sender, recipient, amount);

      if (lockProxyAddresses[recipient]) {
          _burn(recipient, amount); // auto-burn to maintain total supply
      }
  }
}
