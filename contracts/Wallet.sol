pragma solidity 0.6.5;

import "./lib/math/SafeMath.sol";
import "./lib/utils/Address.sol";

interface ERC20 {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface Vault {
    function deposit(string calldata _externalAddress) external payable;

    function depositToken(
        address _assetId,
        uint256 _amount,
        string calldata _externalAddress
    ) external;
}

contract Wallet {
    using SafeMath for uint256;
    using Address for address;

    address public nativeAddress;
    string public externalAddress;
    address public vaultAddress;
    uint256 public nonce;

    bool isInitialized;

    function initialize(
        address _nativeAddress,
        string calldata _externalAddress,
        address _vaultAddress
    )
        external
    {
        require(isInitialized == false, "Contract already initialized");
        isInitialized = true;
        nativeAddress = _nativeAddress;
        externalAddress = _externalAddress;
        vaultAddress = _vaultAddress;
    }

    function sendETH() external {
        uint256 amount = address(this).balance;
        Vault vault = Vault(vaultAddress);
        vault.deposit{value: amount}(externalAddress);
    }

    function sendERC20Tokens(address _assetId) external {
        uint256 amount = _tokenBalance(_assetId);
        _sendERC20Tokens(_assetId, amount);
    }

    function sendERC20Tokens(
        address _assetId,
        uint256 _amount
    )
        external
    {
        _sendERC20Tokens(_assetId, _amount);
    }

    function setAllowance(address _assetId, uint256 _amount) public {
        ERC20 token = ERC20(_assetId);
        _callOptionalReturn(
            _assetId,
            abi.encodeWithSelector(
                token.approve.selector,
                vaultAddress,
                _amount
            )
        );
    }

    /// @dev Allow this contract to receive Ethereum
    receive() external payable {}

    function _sendERC20Tokens(
        address _assetId,
        uint256 _amount
    )
        private
    {
        ERC20 token = ERC20(_assetId);

        uint256 allowance = token.allowance(address(this), vaultAddress);

        if (_amount > allowance) {
            // set allowance to the max value of uint256
            setAllowance(_assetId, ~uint256(0));
        }

        Vault vault = Vault(vaultAddress);
        vault.depositToken(
            _assetId,
            _amount,
            externalAddress
        );
    }

    /// @notice Returns the number of tokens owned by this contract.
    /// @dev This will not work for Ether tokens, use `externalBalance` for
    /// Ether tokens.
    /// @param _assetId The address of the token to query
    function _tokenBalance(address _assetId) private view returns (uint256) {
        return ERC20(_assetId).balanceOf(address(this));
    }

    /// @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
    /// on the return value: the return value is optional (but if data is returned, it must not be false).
    /// @param target The address targeted by the call.
    /// @param data The call data (encoded using abi.encode or one of its variants).
    function _callOptionalReturn(address target, bytes memory data) private {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves.

        // A Solidity high level call has three parts:
        //  1. The target address is checked to verify it contains contract code
        //  2. The call itself is made, and success asserted
        //  3. The return value is decoded, which in turn checks the size of the returned data.
        // solhint-disable-next-line max-line-length
        require(target.isContract(), "Call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = target.call(data);
        require(success, "Low-level call failed");

        if (returndata.length > 0) { // Return data is optional
            // solhint-disable-next-line max-line-length
            require(abi.decode(returndata, (bool)), "Operation did not succeed");
        }
    }
}
