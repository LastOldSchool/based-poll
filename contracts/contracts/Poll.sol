// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Poll Contract
 * @dev Implements polling functionality with voting limits and deadlines
 * All poll content (questions and options) are stored off-chain
 * Only vote counts, deadlines, and user votes are stored on-chain
 * Users can vote only once per poll and only before the deadline
 */
contract Poll {
    // Poll structure
    struct PollData {
        uint256 deadline;         // Timestamp when voting ends
        bool exists;              // If poll has been created
        mapping(address => uint8) votes; // Tracks who voted for what option (0 = not voted)
        uint256[] voteCounts;     // Count of votes per option
        uint8 optionCount;        // Number of options in the poll (2-6)
    }

    // Maps poll ID to poll data
    mapping(bytes32 => PollData) public polls;
    
    // Events
    event PollCreated(bytes32 indexed pollId, bytes32 prePollId, uint8 optionCount, uint256 deadline);
    event VoteCast(bytes32 indexed pollId, address indexed voter, uint8 optionId);

    /**
     * @dev Calculate actual poll ID from pre-poll ID, option count, and deadline
     * @param _prePollId The preliminary poll ID (generated off-chain)
     * @param _optionCount Number of options
     * @param _deadline Timestamp when the poll ends
     * @return bytes32 The calculated actual poll ID
     */
    function calculateActualPollId(bytes32 _prePollId, uint8 _optionCount, uint256 _deadline) public pure returns (bytes32) {
        return keccak256(abi.encode(_prePollId, _optionCount, _deadline));
    }

    /**
     * @dev Create a new poll
     * @param _prePollId The preliminary poll ID (generated off-chain)
     * @param _optionCount Number of options (2-6 options required)
     * @param _deadline Timestamp when the poll ends
     * @return bytes32 The actual poll ID calculated and used for storage
     */
    function createPoll(bytes32 _prePollId, uint8 _optionCount, uint256 _deadline) public returns (bytes32) {
        // Validate options count
        require(_optionCount >= 2 && _optionCount <= 6, "Poll must have 2-6 options");
        
        // Validate deadline
        require(_deadline > block.timestamp, "Deadline must be in the future");
        
        // Calculate actual poll ID
        bytes32 actualPollId = calculateActualPollId(_prePollId, _optionCount, _deadline);
        
        // Ensure poll doesn't already exist
        require(!polls[actualPollId].exists, "Poll already exists");
        
        // Create poll
        PollData storage newPoll = polls[actualPollId];
        newPoll.deadline = _deadline;
        newPoll.exists = true;
        newPoll.optionCount = _optionCount;
        
        // Set up vote counts
        for (uint8 i = 0; i < _optionCount; i++) {
            newPoll.voteCounts.push(0);
        }
        
        emit PollCreated(actualPollId, _prePollId, _optionCount, _deadline);
        
        return actualPollId;
    }

    /**
     * @dev Vote on a poll or create it if it doesn't exist
     * @param _prePollId The preliminary poll ID
     * @param _optionId The option ID to vote for (1-based index)
     * @param _optionCount Number of options (only used if poll doesn't exist)
     * @param _deadline Poll deadline (only used if poll doesn't exist)
     * @return bytes32 The actual poll ID where the vote was recorded
     */
    function vote(bytes32 _prePollId, uint8 _optionId, uint8 _optionCount, uint256 _deadline) public returns (bytes32) {
        // Calculate actual poll ID
        bytes32 actualPollId = calculateActualPollId(_prePollId, _optionCount, _deadline);
        
        // Check if poll exists, create if not
        if (!polls[actualPollId].exists) {
            createPoll(_prePollId, _optionCount, _deadline);
        }
        
        PollData storage poll = polls[actualPollId];
        
        // Validate vote
        require(block.timestamp <= poll.deadline, "Poll has ended");
        require(poll.votes[msg.sender] == 0, "Already voted");
        require(_optionId > 0 && _optionId <= poll.optionCount, "Invalid option ID");
        
        // Record vote (adjust for 0-based array)
        uint8 arrayIndex = _optionId - 1;
        poll.votes[msg.sender] = _optionId;
        poll.voteCounts[arrayIndex]++;
        
        emit VoteCast(actualPollId, msg.sender, _optionId);
        
        return actualPollId;
    }

    /**
     * @dev Get poll information using actual poll ID
     * @param _pollId The actual poll ID
     * @return deadline The poll deadline timestamp
     * @return voteCounts Array of vote counts per option
     * @return optionCount Number of options
     * @return exists Whether the poll exists
     */
    function getPoll(bytes32 _pollId) public view returns (
        uint256 deadline,
        uint256[] memory voteCounts,
        uint8 optionCount,
        bool exists
    ) {
        PollData storage poll = polls[_pollId];
        return (
            poll.deadline,
            poll.voteCounts,
            poll.optionCount,
            poll.exists
        );
    }

    /**
     * @dev Check if a user has voted in a poll using actual poll ID
     * @param _pollId The actual poll ID
     * @param _voter The voter's address
     * @return hasVoted Whether the user has voted
     * @return optionId The option ID the user voted for (0 if not voted)
     */
    function checkVote(bytes32 _pollId, address _voter) public view returns (bool hasVoted, uint8 optionId) {
        optionId = polls[_pollId].votes[_voter];
        hasVoted = (optionId != 0);
        return (hasVoted, optionId);
    }

    /**
     * @dev Check if a poll has ended using actual poll ID
     * @param _pollId The actual poll ID
     * @return bool Whether the poll has ended
     */
    function isPollEnded(bytes32 _pollId) public view returns (bool) {
        if (!polls[_pollId].exists) {
            return false;
        }
        return block.timestamp > polls[_pollId].deadline;
    }
    
    /**
     * @dev Get poll information using preliminary poll ID and parameters
     * @param _prePollId The preliminary poll ID
     * @param _optionCount Number of options
     * @param _deadline Poll deadline
     * @return deadline The poll deadline timestamp
     * @return voteCounts Array of vote counts per option
     * @return optionCount Number of options
     * @return exists Whether the poll exists
     */
    function getPollByParams(bytes32 _prePollId, uint8 _optionCount, uint256 _deadline) public view returns (
        uint256 deadline,
        uint256[] memory voteCounts,
        uint8 optionCount,
        bool exists
    ) {
        bytes32 actualPollId = calculateActualPollId(_prePollId, _optionCount, _deadline);
        return getPoll(actualPollId);
    }
} 