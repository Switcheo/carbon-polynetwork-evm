// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../libs/token/ERC20/ERC20.sol";
import "../libs/token/ERC20/ERC20Detailed.sol";

/**
* @title JR Coin - Standard ERC20 token for testing
*
* @dev Implementation of the basic standard token.
* https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
*/
contract JRCoin is ERC20, ERC20Detailed {
    constructor() ERC20Detailed("JR Coin", "JRC", 18) public {}

    function mint(address account, uint256 amount) public returns (bool) {
        _mint(account, amount);
        return true;
    }
}
