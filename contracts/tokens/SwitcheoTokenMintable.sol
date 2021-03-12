// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../libs/token/ERC20/ERC20.sol";
import "../libs/token/ERC20/ERC20Detailed.sol";
import "../libs/ownership/Ownable.sol";
import "../libs/math/SafeMath.sol";

/**
* @title SwitcheoTokenMintable - Standard ERC20 token
* with ability for owner to mint.
* @dev Implementation of the basic standard token.
* https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
*/
contract SwitcheoTokenMintable is ERC20, ERC20Detailed, Ownable {
  using SafeMath for uint256;

  address public lockProxyAddress;

  constructor() ERC20Detailed("Switcheo Token", "SWTH", 8) public {}

  function initalize(address _lockProxyAddress) public onlyOwner {
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

  function mint(uint256 amount) external onlyOwner returns (bool) {
      _mint(msg.sender, amount);
      return true;
  }

  function burn(uint256 amount) external returns (bool) {
      _burn(msg.sender, amount);
      return true;
  }
}
