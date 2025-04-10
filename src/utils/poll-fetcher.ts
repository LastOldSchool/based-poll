import { pollContract } from './contract';
import { getCreatedPollById } from "./localStorage";
import { Poll, PollOption } from "./types";

/**
 * Fetches poll data from the blockchain or local storage
 * @param pollId The ID of the poll to fetch
 * @returns Poll data or null if not found
 */
export const fetchPollData = async (pollId: `0x${string}`): Promise<Poll | null> => {
  try {
    // Fetch poll data from blockchain
    const contractPoll = await pollContract.getPoll(pollId, true);
    
    if (!contractPoll || !contractPoll.exists) {
      // Try to get from local storage if not found on blockchain
      return fetchPollFromLocalStorage(pollId);
    }
    
    // Get local poll data for additional metadata
    const localPoll = getCreatedPollById(pollId);
    
    // Create formatted poll object
    const poll: Poll = {
      id: pollId,
      question: localPoll?.question || "Unknown Question",
      deadline: contractPoll.deadline,
      voteCounts: contractPoll.voteCounts,
      optionCount: contractPoll.optionCount,
      exists: contractPoll.exists,
      options: localPoll?.options || createDefaultOptions(contractPoll.optionCount)
    };

    return poll;
  } catch (error) {
    console.error("Error fetching poll data:", error);
    
    // Attempt to recover from local storage as a fallback
    return fetchPollFromLocalStorage(pollId);
  }
};

/**
 * Create default options array when no local data is available
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
 * Fetch poll data from local storage
 * @param pollId The ID of the poll to fetch
 * @returns Poll data or null if not found
 */
function fetchPollFromLocalStorage(pollId: `0x${string}`): Poll | null {
  const localPoll = getCreatedPollById(pollId);
  
  if (!localPoll) {
    return null;
  }
  
  return {
    id: pollId,
    question: localPoll.question,
    deadline: localPoll.deadline,
    voteCounts: new Array(localPoll.optionCount).fill(0),
    optionCount: localPoll.optionCount,
    exists: true,
    options: localPoll.options
  };
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