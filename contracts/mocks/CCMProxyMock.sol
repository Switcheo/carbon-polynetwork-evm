// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

contract CCMProxyMock {
    address ccmAddress;

    constructor(address _ccmAddress) public {
        ccmAddress = _ccmAddress;
    }

    function getEthCrossChainManager() external view returns (address) {
        return ccmAddress;
    }
}
