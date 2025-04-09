import { createPublicClient, http, parseAbiItem } from 'viem';
import { POLL_CONTRACT_ABI, POLL_CONTRACT_ADDRESS } from './config';
import { base } from 'viem/chains';
import { calculatePollId } from './poll-utils';
import { Poll } from './types';

// Add caching for contract call results
type CacheData = {
  data: Poll | null | boolean | `0x${string}` | { hasVoted: boolean; optionId: number };
  timestamp: number;
};

const cache: Record<string, CacheData> = {};
const CACHE_TTL = 30000; // 30 seconds cache lifetime

// Get RPC URL from environment variables or fallback to default
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

/**
 * Public client for read-only operations - created once and reused
 */
export const publicClient = createPublicClient({
  chain: {
    ...base,
    rpcUrls: {
      ...base.rpcUrls,
      default: {
        http: [RPC_URL],
      },
      public: {
        http: [RPC_URL],
      },
    },
  },
  transport: http(RPC_URL, {
    batch: true, // Enable request batching
    // Add some throttling to prevent too many requests
    retryDelay: 1000,
    retryCount: 3
  }),
});

/**
 * Interface for Poll contract methods
 */
export const pollContract = {
  /**
   * Get poll details by poll ID
   * @param pollId - The actual poll ID
   * @param force - Force fetching from blockchain, bypassing cache
   * @returns Poll data
   */
  async getPoll(pollId: `0x${string}`, force = false): Promise<Poll | null> {
    const cacheKey = `getPoll-${pollId}`;
    const cachedData = cache[cacheKey];
    
    // Return cached data if available and not expired, and not forcing a refresh
    if (!force && cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return cachedData.data as Poll | null;
    }
    
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

      // In a real app, we would look up this data from a database or IPFS
      // For now we'll hard-code it to match what we use to generate the poll ID
      const pollQuestion = "What is your favorite Base chain DApp?";
      const pollOptions = [
        "Decentralized Exchange",
        "NFT Marketplace",
        "DeFi Protocol",
        "Social Media",
        "Gaming",
      ];

      const pollData = {
        id: pollId,
        question: pollQuestion,
        options: pollOptions,
        deadline: Number(deadline),
        voteCounts: voteCounts.map((count: bigint) => Number(count)),
        optionCount: Number(optionCount),
        exists: Boolean(exists),
      };
      
      // Cache the result
      cache[cacheKey] = {
        data: pollData,
        timestamp: Date.now()
      };
      
      return pollData;
    } catch (error) {
      console.error('Error fetching poll:', error);
      return null;
    }
  },

  /**
   * Check if a user has already voted in a poll
   * @param pollId - The actual poll ID
   * @param address - User's wallet address
   * @param force - Force fetching from blockchain, bypassing cache
   * @returns Vote information
   */
  async checkVote(pollId: `0x${string}`, address: `0x${string}`, force = false): Promise<{ hasVoted: boolean; optionId: number }> {
    const cacheKey = `checkVote-${pollId}-${address}`;
    const cachedData = cache[cacheKey];
    
    // Return cached data if available and not expired, and not forcing a refresh
    if (!force && cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return cachedData.data as { hasVoted: boolean; optionId: number };
    }
    
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
      const voteData = {
        hasVoted: Boolean(hasVoted),
        optionId: Number(optionId),
      };
      
      // Cache the result
      cache[cacheKey] = {
        data: voteData,
        timestamp: Date.now()
      };
      
      return voteData;
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
    const cacheKey = `isPollEnded-${pollId}`;
    const cachedData = cache[cacheKey];
    
    // Return cached data if available and not expired
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return cachedData.data as boolean;
    }
    
    try {
      const result = await publicClient.readContract({
        address: POLL_CONTRACT_ADDRESS as `0x${string}`,
        abi: POLL_CONTRACT_ABI,
        functionName: 'isPollEnded',
        args: [pollId],
      });

      const hasEnded = Boolean(result);
      
      // Cache the result
      cache[cacheKey] = {
        data: hasEnded,
        timestamp: Date.now()
      };
      
      return hasEnded;
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
    const cacheKey = `calculateActualPollId-${prePollId}-${optionCount}-${deadline}`;
    const cachedData = cache[cacheKey];
    
    // Return cached data if available and not expired
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return cachedData.data as `0x${string}`;
    }
    
    try {
      console.log('Calculating poll ID with:', {
        prePollId,
        optionCount,
        deadline,
        contractAddress: POLL_CONTRACT_ADDRESS,
        rpcUrl: RPC_URL,
      });
      
      const result = await publicClient.readContract({
        address: POLL_CONTRACT_ADDRESS as `0x${string}`,
        abi: POLL_CONTRACT_ABI,
        functionName: 'calculateActualPollId',
        args: [prePollId, optionCount, BigInt(deadline)],
      });

      const pollId = result as `0x${string}`;
      console.log('Successfully calculated poll ID:', pollId);
      
      // Cache the result
      cache[cacheKey] = {
        data: pollId,
        timestamp: Date.now()
      };
      
      return pollId;
    } catch (error) {
      console.error('Error calculating poll ID:', error);
      
      // Try fallback method with client-side calculation
      console.log('Trying fallback method with client-side calculation...');
      try {
        const clientSideId = calculatePollId({ prePollId, optionCount, deadline });
        console.log('Successfully calculated client-side poll ID:', clientSideId);
        return clientSideId;
      } catch (fallbackError) {
        console.error('Fallback calculation also failed:', fallbackError);
        throw new Error('Failed to calculate poll ID with both methods');
      }
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

/**
 * Get all voters who voted for a specific option in a poll from the blockchain
 * @param pollId - The poll ID
 * @param optionId - The option ID (1-based)
 * @returns Promise resolving to an array of voter addresses
 */
export async function getOnChainVotersForOption(pollId: `0x${string}`, optionId: number): Promise<string[]> {
  try {
    // Validate inputs to avoid unnecessary API calls
    if (!pollId || !optionId) {
      console.log("Invalid pollId or optionId for blockchain voter lookup", { pollId, optionId });
      return [];
    }

    console.log(`Searching for voters with pollId ${pollId} and optionId ${optionId}`);
    
    // Get the current block number
    const currentBlock = await publicClient.getBlockNumber();
    
    // Initialize variables for pagination
    const MAX_BLOCK_RANGE = 500; // Alchemy limit
    const allVoters: `0x${string}`[] = [];
    
    // Start from a reasonable block (e.g., 30 days ago) to avoid searching the entire chain
    // Base chain is relatively new, so we could start from a more recent block
    // For demo purposes, we'll start from currentBlock - 10000 or 0 if that's negative
    const startBlock = currentBlock - 10000n > 0n ? currentBlock - 10000n : 0n;
    console.log(`Searching for voters from block ${startBlock} to ${currentBlock}`);
    
    // Loop through block ranges
    for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += BigInt(MAX_BLOCK_RANGE)) {
      // Calculate toBlock, ensuring it doesn't exceed currentBlock
      const toBlock = fromBlock + BigInt(MAX_BLOCK_RANGE - 1) > currentBlock 
        ? currentBlock 
        : fromBlock + BigInt(MAX_BLOCK_RANGE - 1);
      
      try {
        console.log(`Fetching logs from block ${fromBlock} to ${toBlock}`);
        
        // Get logs for this block range
        const voteEvents = await publicClient.getLogs({
          address: POLL_CONTRACT_ADDRESS as `0x${string}`,
          event: parseAbiItem('event VoteCast(bytes32 indexed pollId, address indexed voter, uint8 optionId)'),
          args: {
            pollId
          },
          fromBlock,
          toBlock
        });
        
        // Filter events to get only votes for the specified option
        const optionVoters = voteEvents
          .filter(event => {
            if (!event.args) return false;
            
            // Convert the optionId to a number for comparison
            const eventOptionId = typeof event.args.optionId === 'bigint' 
              ? Number(event.args.optionId) 
              : typeof event.args.optionId === 'number' 
                ? event.args.optionId 
                : null;
            
            return eventOptionId === optionId;
          })
          .map(event => event.args?.voter)
          .filter((address): address is `0x${string}` => !!address);
        
        // Add to our result array
        allVoters.push(...optionVoters);
        
        console.log(`Found ${optionVoters.length} voters in blocks ${fromBlock}-${toBlock}`);
      } catch (rangeError) {
        console.error(`Error fetching block range ${fromBlock}-${toBlock}:`, rangeError);
        // Continue to the next range even if there's an error
      }
    }
    
    // Remove duplicates
    const uniqueVoters = [...new Set(allVoters)];
    console.log(`Found ${uniqueVoters.length} unique voters for option ${optionId}`);
    
    return uniqueVoters;
  } catch (error) {
    console.error(`Error getting voters for option ${optionId}:`, error);
    return [];
  }
}