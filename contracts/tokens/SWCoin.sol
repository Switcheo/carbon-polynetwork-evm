// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
* @title SW Coin - ERC20 token for testing
*/
contract SWCoin is ERC20 {
    constructor(string memory symbol) ERC20("SWCoin", symbol) public {
      uint256 amount = 1_000_000 * 10000_0000;
      _mint(msg.sender, amount);
    }

    function decimals() public view override returns (uint8) {
      return 8;
    }
}
