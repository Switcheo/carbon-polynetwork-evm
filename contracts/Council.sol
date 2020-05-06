pragma solidity 0.6.5;

import "./lib/math/SafeMath.sol";
import "./Vault.sol";

contract Council {
    using SafeMath for uint256;

    mapping(address => uint256) public votingPowers;
    mapping(bytes32 => bool) public usedHashes;
    mapping(bytes32 => uint256) public withdrawalHashes;
    mapping(uint256 => bytes32) public merkleRoots;

    uint256 public latestBlockTime;
    uint256 public totalVotingPower;
    Vault vault;

    event VotingPowerIncrease(
        address voter,
        uint256 amount
    );
    event VotingPowerDecrease(
        address voter,
        uint256 amount
    );

    constructor(address vaultAddress) public {
        totalVotingPower = 100;
        votingPowers[msg.sender] = 100;
        vault = Vault(vaultAddress);
    }

    function addMerkleRoot(
        bytes32 merkleRoot,
        uint256 blockTime,
        bytes32[] memory processedDeposits,
        bytes32 withdrawalHash,
        address[] memory _signers,
        uint8[] memory _v,
        bytes32[] memory _r,
        bytes32[] memory _s
    )
        public
    {
        uint256 startGas = gasleft();

        bytes32 message = keccak256(abi.encodePacked(
            "addMerkleRoot",
            address(this),
            merkleRoot,
            blockTime,
            processedDeposits,
            withdrawalHash
        ));

        require(
            merkleRoot != bytes32(0),
            "Merkle root cannot be empty"
        );

        require(
            merkleRoots[blockTime] == bytes32(0),
            "Merkle root for block height already exists"
        );

        validateSignatures(
            message,
            _signers,
            _v,
            _r,
            _s
        );

        merkleRoots[blockTime] = merkleRoot;

        if (blockTime > latestBlockTime) {
            latestBlockTime = blockTime;
        }

        vault.clearPendingDeposits(processedDeposits);

        if (withdrawalHash != bytes32(0)) {
            require(
                withdrawalHashes[withdrawalHash] == 0,
                "Withdrawal hash already exists"
            );

            // add 70k gas for buffer, 21k for base transaction fee
            // 49k for storage and event emission fees
            uint256 networkFee = (startGas - gasleft() + 70000) * tx.gasprice;
            withdrawalHashes[withdrawalHash] = networkFee;
        }
    }

    function addWithdrawer(
        address _withdrawer,
        uint256 _nonce,
        address[] memory _signers,
        uint8[] memory _v,
        bytes32[] memory _r,
        bytes32[] memory _s
    )
        public
    {
        bytes32 message = keccak256(abi.encodePacked(
            "addWithdrawer",
            address(this),
            _withdrawer,
            _nonce
        ));

        validateSignatures(
            message,
            _signers,
            _v,
            _r,
            _s
        );

        vault.addWithdrawer(_withdrawer, _nonce);
    }

    function removeWithdrawer(
        address[] memory _signers,
        uint8[] memory _v,
        bytes32[] memory _r,
        bytes32[] memory _s
    )
        public
    {
        bytes32 message = keccak256(abi.encodePacked(
            "removeWithdrawer",
            address(this)
        ));

        validateSignatures(
            message,
            _signers,
            _v,
            _r,
            _s
        );

        vault.removeWithdrawer();
    }

    function updateVotingPowers(
        address[] memory _voters,
        uint256[] memory _powers,
        uint256 _totalPower,
        uint256 _nonce,
        address[] memory _signers,
        uint8[] memory _v,
        bytes32[] memory _r,
        bytes32[] memory _s
    )
        public
    {
        require(
            _voters.length > 0,
            "Input cannot be empty"
        );

        require(
            _voters.length == _powers.length,
            "Invalid input lengths"
        );

        bytes32 message = keccak256(abi.encodePacked(
            "updateVotingPowers",
            address(this),
            _voters,
            _powers,
            _totalPower,
            _nonce
        ));

        require(
            usedHashes[message] == false,
            "Nonce has already been used"
        );

        validateSignatures(
            message,
            _signers,
            _v,
            _r,
            _s
        );

        for (uint256 i = 0; i < _voters.length; i++) {
            address voter = _voters[i];
            uint256 prevPower = votingPowers[voter];
            uint256 newPower = _powers[i];
            votingPowers[voter] = newPower;

            if (newPower > prevPower) {
                emit VotingPowerIncrease(voter, newPower - prevPower);
            } else {
                emit VotingPowerDecrease(voter, prevPower - newPower);
            }
        }

        usedHashes[message] = true;
    }

    function validateSignatures(
        bytes32 _message,
        address[] memory _signers,
        uint8[] memory _v,
        bytes32[] memory _r,
        bytes32[] memory _s
    )
        public
        view
    {
        require(
            _signers.length > 0,
            "Signers cannot be empty"
        );

        require(
            _signers.length == _v.length &&
            _signers.length == _r.length &&
            _signers.length == _s.length,
            "Invalid input lengths"
        );

        bytes32 prefixedMessage = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            _message
        ));

        uint256 prevSignerValue = 0;
        uint256 votingPower = 0;
        for (uint256 i = 0; i < _signers.length; i++) {
            address signer = _signers[i];
            uint256 signerValue = uint256(signer);
            // signers must be arranged in a strictly ascending order
            // this is to ensure that all values in the signers array is unique
            require(
                signerValue > prevSignerValue,
                "Invalid signers arragement"
            );
            require(
                signer == ecrecover(prefixedMessage, _v[i], _r[i], _s[i]),
                "Invalid signature"
            );

            votingPower += votingPowers[signer];
            prevSignerValue = signerValue;
        }

        // require that voting power of signers is more than 2/3 of totalVotingPower
        require(votingPower * 3 > 2 * totalVotingPower, "Insufficent voting power");
    }
}
