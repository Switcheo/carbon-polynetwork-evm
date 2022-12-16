// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../libs/token/ERC20/ERC20Detailed.sol";
import "./CarbonWrappedERC20.sol";

/**
* @title CarbonTokenArbi - Carbon Token for Arbitrum
*
* @dev Standard ERC20 that mints / burns to the PoS lockProxy
* contract.
* https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
*/
contract CarbonTokenArbi is CarbonWrappedERC20, ERC20Detailed {
  constructor(address lockProxyAddress) 
  ERC20Detailed("Carbon Token", "SWTH", 8) 
  CarbonWrappedERC20(lockProxyAddress)
  public {
  }
}
