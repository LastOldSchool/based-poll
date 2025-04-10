"use client";

import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { POLL_CONTRACT_ABI, POLL_CONTRACT_ADDRESS } from "./config";
import { Poll } from "./types";

/**
 * Cache to store poll data and reduce redundant requests
 */
const pollCache: Record<string, { data: unknown; timestamp: number }> = {};

/**
 * Cache expiration time in ms (5 minutes)
 */
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Default timeout for requests in ms (10 seconds)
 */
const DEFAULT_TIMEOUT = 10000;

// Get RPC URL from environment variables or fallback to default
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

/**
 * Create a public client for interacting with the blockchain
 */
const publicClient = createPublicClient({
  chain: {
    ...base,
    rpcUrls: {
      ...base.rpcUrls,
      default: {
        http: [RPC_URL],
      },
      public: {
        http: [RPC_URL],
      }
    }
  },
  transport: http(RPC_URL, {
    batch: true,
    retryCount: 3,
    retryDelay: 1000
  })
});

/**
 * Interface for poll contract operations
 */
export const pollContract = {
  /**
   * Get poll details by ID
   * @param pollId - Poll ID to fetch
   * @param forceFetch - Whether to bypass cache and fetch from blockchain
   * @returns Poll data or null if not found
   */
  async getPoll(pollId: string, forceFetch = false): Promise<Poll | null> {
    const cacheKey = `poll-${pollId}`;
    
    // Use cached data if available and not forcing fresh fetch
    if (!forceFetch && pollCache[cacheKey]) {
      const { data, timestamp } = pollCache[cacheKey];
      const now = Date.now();
      
      // Return cached data if not expired
      if (now - timestamp < CACHE_EXPIRATION) {
        return data as Poll;
      }
    }
    
    try {
      console.log(`Fetching poll data for ID: ${pollId}`);
      
      // Fetch poll details with timeout protection
      const pollData = await withTimeout(
        publicClient.readContract({
          address: POLL_CONTRACT_ADDRESS as `0x${string}`,
          abi: POLL_CONTRACT_ABI,
          functionName: 'getPoll',
          args: [pollId as `0x${string}`]
        }),
        DEFAULT_TIMEOUT
      );
      
      console.log(`Raw poll data received:`, pollData);
      
      // Process the poll data
      if (pollData && Array.isArray(pollData) && pollData.length >= 4) {
        const deadline = Number(pollData[0]);
        const voteCounts = Array.isArray(pollData[1]) 
          ? pollData[1].map((count: bigint) => Number(count)) 
          : [];
        const optionCount = Number(pollData[2]);
        const exists = Boolean(pollData[3]);
        
        const poll: Poll = {
          id: pollId as `0x${string}`,
          deadline,
          optionCount,
          voteCounts,
          exists,
          question: "", // Will be filled from local storage later
          options: [] // Will be filled from local storage later
        };
        
        // Cache the poll data
        pollCache[cacheKey] = {
          data: poll,
          timestamp: Date.now()
        };
        
        return poll;
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching poll data:", error);
      
      // For network errors, we might still want to use cached data
      if (pollCache[cacheKey]) {
        return pollCache[cacheKey].data as Poll;
      }
      
      return null;
    }
  },
  
  /**
   * Check if user has voted on a poll
   * @param pollId - Poll ID to check
   * @param address - User address to check
   * @param forceFetch - Whether to bypass cache and fetch from blockchain
   * @returns Object containing vote status and option ID
   */
  async checkVote(pollId: string, address: `0x${string}`, forceFetch = false): Promise<{ hasVoted: boolean; optionId: number }> {
    const cacheKey = `vote-${pollId}-${address}`;
    
    // Use cached data if available and not forcing fresh fetch
    if (!forceFetch && pollCache[cacheKey]) {
      const { data, timestamp } = pollCache[cacheKey];
      const now = Date.now();
      
      // Return cached data if not expired
      if (now - timestamp < CACHE_EXPIRATION) {
        return data as { hasVoted: boolean; optionId: number };
      }
    }
    
    try {
      console.log(`Checking vote for poll ID: ${pollId}, address: ${address}`);
      
      // Make sure we're using valid hex strings by formatting them
      const formattedPollId = pollId.startsWith('0x') ? pollId as `0x${string}` : `0x${pollId}` as `0x${string}`;
      
      // Direct RPC call approach (similar to the script)
      // Using function selector for more reliable results
      const functionSelector = '0xf0786562'; // Function selector for checkVote(bytes32,address)
      
      // Prepare poll ID (remove 0x prefix)
      const pollIdWithout0x = formattedPollId.slice(2);
      
      // Prepare address (remove 0x prefix and pad to 32 bytes)
      const addressWithout0x = address.slice(2).toLowerCase();
      const paddedAddress = addressWithout0x.padStart(64, '0');
      
      // Create call data: function selector + pollId + paddedAddress
      const data = `${functionSelector}${pollIdWithout0x}${paddedAddress}`;
      
      // Make direct eth_call
      const result = await makeRpcCall('eth_call', [{
        to: POLL_CONTRACT_ADDRESS,
        data,
      }, 'latest']);
      
      if (result === '0x' || result === '0x0') {
        return { hasVoted: false, optionId: 0 };
      }
      
      // Decode the result
      // First 32 bytes (64 hex chars) is hasVoted boolean
      // Next 32 bytes is optionId
      const hexResult = typeof result === 'string' ? result.slice(2) : '';
      const hasVoted = parseInt(hexResult.slice(0, 64), 16) !== 0;
      const optionId = parseInt(hexResult.slice(64, 128), 16);
      
      const voteResult = { hasVoted, optionId };
      
      // Cache the vote data
      pollCache[cacheKey] = {
        data: voteResult,
        timestamp: Date.now()
      };
      
      return voteResult;
    } catch (error) {
      console.error("Error checking vote:", error);
      
      // For network errors, we might still want to use cached data
      if (pollCache[cacheKey]) {
        return pollCache[cacheKey].data as { hasVoted: boolean; optionId: number };
      }
      
      return { hasVoted: false, optionId: 0 };
    }
  },
  
  /**
   * Check if a poll has ended
   * @param pollId - Poll ID to check
   * @param forceFetch - Whether to bypass cache and fetch from blockchain
   * @returns True if poll has ended, false otherwise
   */
  async isPollEnded(pollId: string, forceFetch = false): Promise<boolean> {
    // Get poll data
    const poll = await this.getPoll(pollId, forceFetch);
    if (!poll) return false;
    
    // Check if deadline has passed
    const now = Math.floor(Date.now() / 1000);
    return now > poll.deadline;
  },
  
  /**
   * Clear cache for a specific poll or all polls
   * @param pollId - Optional poll ID to clear cache for
   */
  clearCache(pollId?: string): void {
    if (pollId) {
      // Clear cache for specific poll
      Object.keys(pollCache).forEach(key => {
        if (key.includes(pollId)) {
          delete pollCache[key];
        }
      });
    } else {
      // Clear all cache
      Object.keys(pollCache).forEach(key => {
        delete pollCache[key];
      });
    }
  }
};

/**
 * Execute a promise with a timeout
 * @param promise - Promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise result or throws if timeout is reached
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  // Create a timeout promise that rejects after specified time
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  try {
    // Race between the actual promise and the timeout promise
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    // Clear the timeout
    clearTimeout(timeoutId!);
  }
}

/**
 * Makes a direct RPC call to the blockchain
 * @param method - The JSON-RPC method to call
 * @param params - The parameters for the RPC method
 * @returns A promise that resolves to the RPC response
 */
async function makeRpcCall(method: string, params: unknown[]): Promise<unknown> {
  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    const data = await response.json();
    
    if ('error' in data && data.error) {
      throw new Error(`RPC Error: ${JSON.stringify(data.error)}`);
    }
    
    return data.result;
  } catch (error) {
    console.error(`RPC call failed: ${error}`);
    throw error;
  }
}