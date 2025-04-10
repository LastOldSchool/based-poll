import { pollContract } from './contract';
import { Poll, PollOption } from "./types";

/**
 * Fetches poll data from the blockchain
 * @param pollId The ID of the poll to fetch
 * @returns Poll data or null if not found
 */
export const fetchPollData = async (pollId: `0x${string}`): Promise<Poll | null> => {
  try {
    // Fetch poll data from blockchain
    const contractPoll = await pollContract.getPoll(pollId, true);
    
    if (!contractPoll || !contractPoll.exists) {
      return null;
    }
    
    // Create formatted poll object
    const poll: Poll = {
      id: pollId,
      question: "Unknown Question", // Default question when no metadata available
      deadline: contractPoll.deadline,
      voteCounts: contractPoll.voteCounts,
      optionCount: contractPoll.optionCount,
      exists: contractPoll.exists,
      options: createDefaultOptions(contractPoll.optionCount)
    };

    return poll;
  } catch (error) {
    console.error("Error fetching poll data:", error);
    return null;
  }
};

/**
 * Create default options array when no metadata is available
 * @param optionCount Number of options to create
 * @returns Array of PollOption objects
 */
function createDefaultOptions(optionCount: number): PollOption[] {
  return Array(optionCount)
    .fill(0)
    .map((_, index) => ({
      id: index + 1,
      text: `Option ${index + 1}`
    }));
}

/**
 * Checks if a user has voted on a particular poll
 * @param pollId The ID of the poll to check
 * @param address The user's wallet address
 * @returns Vote status with hasVoted flag and optionId
 */
export const checkVoteStatus = async (
  pollId: `0x${string}`, 
  address?: `0x${string}`,
  forceFetch: boolean = false
): Promise<{ hasVoted: boolean; optionId: number }> => {
  // If no address, user hasn't voted
  if (!address) {
    return { hasVoted: false, optionId: 0 };
  }

  try {
    // Check if user has voted on this poll
    return await pollContract.checkVote(pollId, address, forceFetch);
  } catch (error) {
    console.error("Error checking vote status:", error);
    return { hasVoted: false, optionId: 0 };
  }
};

/**
 * Loads complete poll details including data and vote status
 * @param pollId The ID of the poll to load
 * @param address The user's wallet address (optional)
 * @returns Object containing poll data and vote result
 */
export const loadPollDetails = async (
  pollId: `0x${string}`,
  address?: `0x${string}`
): Promise<{
  pollData: Poll | null;
  voteResult: { hasVoted: boolean; optionId: number };
}> => {
  // Fetch both poll data and vote status in parallel
  // Always force a fresh fetch from the blockchain to avoid stale data
  const [pollData, voteResult] = await Promise.all([
    fetchPollData(pollId),
    checkVoteStatus(pollId, address, true), // Force fresh fetch for vote status
  ]);

  return {
    pollData,
    voteResult,
  };
}; 