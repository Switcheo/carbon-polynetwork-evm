// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../libs/token/ERC20/ERC20.sol";
import "../libs/token/ERC20/ERC20Detailed.sol";
import "../libs/math/SafeMath.sol";

/**
* @title SwitcheoTokenBSC - Switcheo Token for Binance Smart Chain (BSC)
*
* @dev Standard ERC20 that mints / burns to the PoS lockProxy
* contract.
* https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
*/
contract SwitcheoTokenBSC is ERC20, ERC20Detailed {
  using SafeMath for uint256;

  address public lockProxyAddress;

  constructor() ERC20Detailed("Switcheo Token", "SWTH", 8) public {}

  function initalize(address _lockProxyAddress) public {
      require(lockProxyAddress == address(0), "SwitcheoToken: Already Initialized");
      lockProxyAddress = _lockProxyAddress;
  }

  function _transfer(address sender, address recipient, uint256 amount) internal override {
      if (sender == lockProxyAddress) {
          require(recipient != lockProxyAddress, "SwitcheoToken: lockProxy should not call transfer to self");
          _mint(lockProxyAddress, amount); // lockProxy is the primary minter
      }

      super._transfer(sender, recipient, amount);

      if (recipient == lockProxyAddress) {
          _burn(lockProxyAddress, amount); // auto-burn to maintain total supply
      }
  }

}
