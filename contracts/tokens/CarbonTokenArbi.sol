// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../libs/token/ERC20/ERC20Detailed.sol";
import "./CarbonWrappedERC20.sol";

/**
* @title CarbonTokenArbi - Carbon Token for Arbitrum
*
* @dev Carbon Token (SWTH)
*/
contract CarbonTokenArbi is CarbonWrappedERC20, ERC20Detailed {
  constructor(address lockProxyAddress) 
  ERC20Detailed("Carbon Token", "SWTH", 8) 
  CarbonWrappedERC20(lockProxyAddress)
  public {
  }
}
