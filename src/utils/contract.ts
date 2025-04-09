import { createPublicClient, http } from 'viem';
import { POLL_CONTRACT_ABI, POLL_CONTRACT_ADDRESS } from './config';
import { base } from 'viem/chains';
import { calculatePollId } from './poll-utils';
import { Poll } from './types';

/**
 * Public client for read-only operations
 */
export const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * Interface for Poll contract methods
 */
export const pollContract = {
  /**
   * Get poll details by poll ID
   * @param pollId - The actual poll ID
   * @returns Poll data
   */
  async getPoll(pollId: `0x${string}`): Promise<Poll | null> {
    try {
      const result = await publicClient.readContract({
        address: POLL_CONTRACT_ADDRESS as `0x${string}`,
        abi: POLL_CONTRACT_ABI,
        functionName: 'getPoll',
        args: [pollId],
      });

      if (!result || !Array.isArray(result) || result.length < 4) return null;

      // Extract values from result
      const [deadline, voteCounts, optionCount, exists] = result;

      // Return null if poll doesn't exist
      if (!exists) return null;

      return {
        id: pollId,
        question: '', // Question is stored off-chain
        options: [], // Options are stored off-chain
        deadline: Number(deadline),
        voteCounts: voteCounts.map((count: bigint) => Number(count)),
        optionCount: Number(optionCount),
        exists: Boolean(exists),
      };
    } catch (error) {
      console.error('Error fetching poll:', error);
      return null;
    }
  },

  /**
   * Check if a user has already voted in a poll
   * @param pollId - The actual poll ID
   * @param address - User's wallet address
   * @returns Vote information
   */
  async checkVote(pollId: `0x${string}`, address: `0x${string}`): Promise<{ hasVoted: boolean; optionId: number }> {
    try {
      const result = await publicClient.readContract({
        address: POLL_CONTRACT_ADDRESS as `0x${string}`,
        abi: POLL_CONTRACT_ABI,
        functionName: 'checkVote',
        args: [pollId, address],
      });

      if (!result || !Array.isArray(result) || result.length < 2) {
        return { hasVoted: false, optionId: 0 };
      }

      const [hasVoted, optionId] = result;
      return {
        hasVoted: Boolean(hasVoted),
        optionId: Number(optionId),
      };
    } catch (error) {
      console.error('Error checking vote:', error);
      return { hasVoted: false, optionId: 0 };
    }
  },

  /**
   * Check if a poll has ended
   * @param pollId - The actual poll ID
   * @returns Whether the poll has ended
   */
  async isPollEnded(pollId: `0x${string}`): Promise<boolean> {
    try {
      const result = await publicClient.readContract({
        address: POLL_CONTRACT_ADDRESS as `0x${string}`,
        abi: POLL_CONTRACT_ABI,
        functionName: 'isPollEnded',
        args: [pollId],
      });

      return Boolean(result);
    } catch (error) {
      console.error('Error checking if poll has ended:', error);
      return false;
    }
  },

  /**
   * Calculate actual poll ID from parameters
   * @param prePollId - Pre-poll ID generated from question
   * @param optionCount - Number of options in the poll
   * @param deadline - Poll deadline timestamp
   * @returns The actual poll ID
   */
  async calculateActualPollId(
    prePollId: `0x${string}`,
    optionCount: number,
    deadline: number
  ): Promise<`0x${string}`> {
    try {
      const result = await publicClient.readContract({
        address: POLL_CONTRACT_ADDRESS as `0x${string}`,
        abi: POLL_CONTRACT_ABI,
        functionName: 'calculateActualPollId',
        args: [prePollId, optionCount, BigInt(deadline)],
      });

      return result as `0x${string}`;
    } catch (error) {
      console.error('Error calculating poll ID:', error);
      // Fall back to client-side calculation if contract call fails
      return calculatePollId({ prePollId, optionCount, deadline });
    }
  },

  /**
   * Get all polls with details (for demo, would need backend indexing in production)
   * This is a mock function as the contract doesn't provide an enumeration method
   * @returns Array of polls with details
   */
  async getPolls(): Promise<Poll[]> {
    // In a real app, this would need to come from an indexer or backend API
    // This is just a placeholder
    return [];
  }
}; 