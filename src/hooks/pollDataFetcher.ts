"use client";

import { getCreatedPollById, StoredPoll } from "@/utils/localStorage";
import { calculatePollId } from "@/utils/poll-utils";
import { pollContract } from "@/utils/contract";
import { Poll, PollOption } from "@/utils/types";

/**
 * Fetches poll data from blockchain or local storage
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
    // Get stored poll data
    const localPoll = getCreatedPollById(pollId);
    let contractPollId = pollId;
    
    // If we have local data with prePollId, calculate the correct contract ID
    if (localPoll?.prePollId) {
      const params = {
        prePollId: localPoll.prePollId as `0x${string}`,
        optionCount: localPoll.optionCount,
        deadline: localPoll.deadline
      };
      
      try {
        // Calculate the ID as it would be on the contract
        const calculatedId = calculatePollId(params);
        
        // If different from our stored ID, update
        if (calculatedId !== pollId) {
          contractPollId = calculatedId;
        }
      } catch (error) {
        console.error("Error calculating contract poll ID:", error);
      }
    }
    
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
      
      // Combine blockchain data with local metadata
      const enhancedData: Poll = {
        ...contractData,
        question: localPoll?.question || "Unknown Question",
        options: localPoll?.options || defaultOptions
      };
      
      // Update stored poll if needed
      if (contractPollId !== pollId && localPoll) {
        const updatedPoll: StoredPoll = {
          ...localPoll,
          id: contractPollId as string
        };
        saveCreatedPoll(updatedPoll);
      }
      
      return { pollData: enhancedData, isPollError: false };
    }
    
    // Fallback to local data if available
    if (localPoll) {
      const localPollData: Poll = {
        id: localPoll.id as `0x${string}`,
        question: localPoll.question,
        options: localPoll.options,
        deadline: localPoll.deadline,
        voteCounts: new Array(localPoll.optionCount).fill(0),
        optionCount: localPoll.optionCount,
        exists: true
      };
      
      return { pollData: localPollData, isPollError: false };
    }
    
    // No data available
    return { pollData: null, isPollError: true };
    
  } catch (error) {
    console.error("Error fetching poll:", error);
    
    // Try to get the poll from localStorage as fallback
    const localPoll = getCreatedPollById(pollId);
    
    if (localPoll) {
      const localPollData: Poll = {
        id: localPoll.id as `0x${string}`,
        question: localPoll.question,
        options: localPoll.options,
        deadline: localPoll.deadline,
        voteCounts: new Array(localPoll.optionCount).fill(0),
        optionCount: localPoll.optionCount,
        exists: true
      };
      
      return { pollData: localPollData, isPollError: false };
    } else {
      return { pollData: null, isPollError: true };
    }
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
    // Get stored poll data to calculate correct poll ID
    const storedPoll = getCreatedPollById(pollData.id);
    let contractPollId = pollData.id;
    
    // If we have local data with prePollId, calculate accurate poll ID
    if (storedPoll?.prePollId) {
      const params = {
        prePollId: storedPoll.prePollId as `0x${string}`,
        optionCount: storedPoll.optionCount,
        deadline: storedPoll.deadline
      };
      
      try {
        const calculatedId = calculatePollId(params);
        if (calculatedId !== pollData.id) {
          contractPollId = calculatedId;
        }
      } catch (error) {
        console.error("Error calculating contract poll ID in getVoteResult:", error);
      }
    }
    
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