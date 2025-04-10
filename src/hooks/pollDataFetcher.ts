"use client";

import { StoredPoll } from "@/utils/types";
import { pollContract } from "@/utils/contract";
import { Poll, PollOption } from "@/utils/types";

/**
 * Fetches poll data from blockchain
 * @param pollId - ID of the poll to fetch
 * @param makeChainRequest - Function to make a deduplicated chain request
 * @param forceFetch - Whether to force fetching from blockchain, bypassing cache
 * @returns Object containing poll data and error status
 */
export async function fetchPollData(
  pollId: `0x${string}`,
  makeChainRequest: <T>(key: string, requestFn: () => Promise<T>, maxRetries?: number) => Promise<T>,
  forceFetch = false
): Promise<{ pollData: Poll | null; isPollError: boolean }> {
  try {
    const contractPollId = pollId;
    
    // Fetch data from blockchain
    const contractData = await makeChainRequest(
      `getPoll-${contractPollId}${forceFetch ? '-force' : ''}`,
      () => pollContract.getPoll(contractPollId, forceFetch)
    );
    
    // If blockchain data exists, use it
    if (contractData && contractData.exists) {
      // Create default options if local poll doesn't exist
      const defaultOptions: PollOption[] = Array(contractData.optionCount)
        .fill(0)
        .map((_, i) => ({ id: i + 1, text: `Option ${i + 1}` }));
      
      // Use blockchain data with default options
      const enhancedData: Poll = {
        ...contractData,
        question: "Unknown Question",
        options: defaultOptions
      };
      
      return { pollData: enhancedData, isPollError: false };
    }
    
    // No data available
    return { pollData: null, isPollError: true };
    
  } catch (error) {
    console.error("Error fetching poll:", error);
    return { pollData: null, isPollError: true };
  }
}

/**
 * Get user's vote result for a specific poll
 * @param pollData - The poll data
 * @param address - User's wallet address
 * @param makeChainRequest - Function to make a deduplicated chain request
 * @param forceFetch - Whether to force fetching from blockchain, bypassing cache
 * @returns Promise resolving to vote result
 */
export async function getVoteResult(
  pollData: Poll | null,
  address: `0x${string}` | undefined,
  makeChainRequest: <T>(key: string, requestFn: () => Promise<T>, maxRetries?: number) => Promise<T>,
  forceFetch = false
): Promise<{ hasVoted: boolean; optionId: number }> {
  if (!pollData || !address) return { hasVoted: false, optionId: 0 };
  
  try {
    const contractPollId = pollData.id;
    
    // Format the poll ID to ensure it's a valid hex string
    const formattedPollId = contractPollId.startsWith('0x') 
      ? contractPollId as `0x${string}` 
      : `0x${contractPollId}` as `0x${string}`;
    
    console.log(`Checking vote result for poll: ${formattedPollId}, address: ${address}`);
    
    // Check vote on blockchain with retry logic
    try {
      return await makeChainRequest(
        `checkVote-${formattedPollId}-${address}${forceFetch ? '-force' : ''}`,
        () => pollContract.checkVote(formattedPollId, address as `0x${string}`, forceFetch),
        3 // Max retries
      );
    } catch (chainError) {
      console.error("Contract error when checking vote:", chainError);
      
      // If contract call failed completely, assume user hasn't voted yet
      return { hasVoted: false, optionId: 0 };
    }
  } catch (error) {
    console.error("Error getting vote result:", error);
    return { hasVoted: false, optionId: 0 };
  }
}

/**
 * Helper function to save created poll in local storage
 * @param pollData The poll data to save
 */
export function saveCreatedPoll(pollData: StoredPoll) {
  const { localStorage } = window;
  const existingPolls = localStorage.getItem('createdPolls');
  let polls: StoredPoll[] = [];
  
  if (existingPolls) {
    try {
      polls = JSON.parse(existingPolls);
      // Replace existing poll if it exists
      const existingIndex = polls.findIndex(p => p.id === pollData.id);
      if (existingIndex >= 0) {
        polls[existingIndex] = pollData;
      } else {
        polls.push(pollData);
      }
    } catch (error) {
      console.error('Error parsing stored polls:', error);
      polls = [pollData];
    }
  } else {
    polls = [pollData];
  }
  
  localStorage.setItem('createdPolls', JSON.stringify(polls));
} 