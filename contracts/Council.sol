pragma solidity 0.6.5;

import "./lib/math/SafeMath.sol";

contract Council {
    using SafeMath for uint256;

    mapping(address => uint256) public votingPowers;
    mapping(uint256 => bool) public usedNonces;
    uint256 public totalVotingPower;

    event VotingPowerIncrease(
        address voter,
        uint256 amount
    );
    event VotingPowerDecrease(
        address voter,
        uint256 amount
    );

    constructor() public {
        totalVotingPower = 100;
        votingPowers[msg.sender] = 100;
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

        require(
            usedNonces[_nonce] == false,
            "Nonce has already been used"
        );

        bytes32 messageHash = keccak256(abi.encodePacked(
            _voters,
            _powers,
            _totalPower,
            _nonce
        ));

        validateSigners(
            messageHash,
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

        usedNonces[_nonce] = true;
    }

    function validateSigners(
        bytes32 _messageHash,
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
                signer == ecrecover(_messageHash, _v[i], _r[i], _s[i]),
                "Invalid signature"
            );

            votingPower += votingPowers[signer];
            prevSignerValue = signerValue;
        }

        // require that voting power of signers is more than 2/3 of totalVotingPower
        require(votingPower * 3 > 2 * totalVotingPower);
    }
}
