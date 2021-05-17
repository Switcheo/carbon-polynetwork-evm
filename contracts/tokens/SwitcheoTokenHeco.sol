// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../libs/token/ERC20/ERC20.sol";
import "../libs/token/ERC20/ERC20Detailed.sol";
import "../libs/ownership/Ownable.sol";
import "../libs/math/SafeMath.sol";

/**
* @title SwitcheoTokenHeco - Switcheo Token used for Huobi EcoChain.
*
* @dev Standard ERC-20 with ability for owner to add multiple lock proxies
* at a later time. Delegates 2.1m locked supply to the polynetwork bridge contract.
* https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
*/
contract SwitcheoTokenHeco is ERC20, ERC20Detailed, Ownable {
  using SafeMath for uint256;

  mapping(address => bool) public lockProxyAddresses;
  address public bridgeAddress;

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

  function delegateToBridge(address _bridgeAddress) public onlyOwner {
      require(bridgeAddress == address(0), "SwitcheoToken: already delegated bridge assets");
      require(_bridgeAddress != address(0), "SwitcheoToken: bridge asset cannot be zero");
      bridgeAddress = _bridgeAddress;
      _mint(_bridgeAddress, 0.21 ether);
  }

  function circulatingSupply() external view returns (uint256 amount) {
      return totalSupply().sub(balanceOf(bridgeAddress));
  }
}
