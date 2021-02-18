// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./libs/utils/Utils.sol";
import "./libs/token/ERC20/IERC20.sol";

/// @title The Wallet contract for Switcheo TradeHub
/// @author Switcheo Network
/// @notice This contract faciliates deposits for Switcheo TradeHub.
/// @dev This contract is used together with the LockProxy contract to allow users
/// to deposit funds without requiring them to have ETH
contract Wallet {
    bool public isInitialized;
    address public creator;
    address public owner;
    bytes public swthAddress;

    function initialize(address _owner, bytes calldata _swthAddress) external {
        require(isInitialized == false, "Contract already initialized");
        isInitialized = true;
        creator = msg.sender;
        owner = _owner;
        swthAddress = _swthAddress;
    }

    /// @dev Allow this contract to receive Ethereum
    receive() external payable {}

    /// @dev Allow this contract to receive ERC223 tokens
    // An empty implementation is required so that the ERC223 token will not
    // throw an error on transfer
    function tokenFallback(address, uint, bytes calldata) external {}

    /// @dev send ETH from this contract to its creator
    function sendETHToCreator(uint256 _amount) external {
        require(msg.sender == creator, "Sender must be creator");
        // we use `call` here following the recommendation from
        // https://diligence.consensys.net/blog/2019/09/stop-using-soliditys-transfer-now/
        (bool success,  ) = creator.call{value: _amount}("");
        require(success, "Transfer failed");
    }

    /// @dev send tokens from this contract to its creator
    function sendERC20ToCreator(address _assetId, uint256 _amount) external {
        require(msg.sender == creator, "Sender must be creator");

        IERC20 token = IERC20(_assetId);
        Utils.callOptionalReturn(
            token,
            abi.encodeWithSelector(
                token.transfer.selector,
                creator,
                _amount
            )
        );
    }
}
