"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { generatePrePollId, calculatePollId } from "../utils/poll-utils";
import { PollParams, Poll, PollOption } from '@/utils/types';
import { pollContract } from '@/utils/contract';
import { useAccount, useWalletClient } from "wagmi";
import { POLL_CONTRACT_ABI, POLL_CONTRACT_ADDRESS } from "../utils/config";
import { saveCreatedPoll, getCreatedPollById, StoredPoll } from "../utils/localStorage";

/**
 * Custom hook to interact with the poll contract
 * @returns Object containing poll data and functions to interact with polls
 */
export function usePoll() {
  const [pollParams, setPollParams] = useState<PollParams | null>(null);
  const [pollId, setPollId] = useState<`0x${string}` | null>(null);
  const [pollData, setPollData] = useState<Poll | null>(null);
  const [isPollLoading, setIsPollLoading] = useState(false);
  const [isPollError, setIsPollError] = useState(false);
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const requestsInProgressRef = useRef<Record<string, Promise<unknown>>>({});
  const retryCountRef = useRef<Record<string, number>>({});

  /**
   * Make a deduplicated chain request to prevent multiple in-flight requests for the same data
   * @param key - Unique key for the request
   * @param requestFn - Function to execute the request
   * @param maxRetries - Maximum number of retries
   * @returns Promise with the request result
   */
  const makeChainRequest = useCallback(async <T,>(
    key: string, 
    requestFn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> => {
    // Return existing promise if request is already in progress
    if (key in requestsInProgressRef.current) {
      return requestsInProgressRef.current[key] as Promise<T>;
    }

    // Reset retry count if it's a new request
    if (!(key in retryCountRef.current)) {
      retryCountRef.current[key] = 0;
    }

    // Create a new request promise
    const requestPromise = requestFn().catch(async (error) => {
      // Handle retry logic for certain errors
      if (retryCountRef.current[key] < maxRetries && 
         (error.message.includes('timeout') || error.message.includes('no data') || error.message.includes('0x'))) {
        
        console.log(`Retrying request ${key}, attempt ${retryCountRef.current[key] + 1}/${maxRetries}`);
        retryCountRef.current[key]++;
        
        // Wait a bit before retrying (increasing delay for each retry)
        const delay = 1000 * retryCountRef.current[key];
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Remove the failed request from in-progress tracking
        delete requestsInProgressRef.current[key];
        
        // Try again
        return makeChainRequest(key, requestFn, maxRetries);
      }
      
      // If we've exhausted retries or it's not a retriable error, propagate it
      throw error;
    });
    
    requestsInProgressRef.current[key] = requestPromise;

    try {
      return await requestPromise;
    } finally {
      // Clean up after completion
      delete requestsInProgressRef.current[key];
    }
  }, []);

  /**
   * Refetch poll data from blockchain or local storage
   * @param forceFetch - Whether to force fetching from blockchain, bypassing cache
   */
  const refetchPoll = useCallback(async (forceFetch = false) => {
    if (!pollId) return;
    
    setIsPollLoading(true);
    
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
        
        setPollData(enhancedData);
        setIsPollError(false);
        return;
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
        
        setPollData(localPollData);
        setIsPollError(false);
        return;
      }
      
      // No data available
      setPollData(null);
      setIsPollError(true);
      
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
        
        setPollData(localPollData);
        setIsPollError(false);
      } else {
        setPollData(null);
        setIsPollError(true);
      }
    } finally {
      setIsPollLoading(false);
    }
  }, [pollId, makeChainRequest]);

  /**
   * Create a new poll
   * @param question - The poll question
   * @param options - Array of poll option texts
   * @param deadline - Timestamp when the poll ends
   * @returns Promise resolving to transaction hash or null
   */
  const createPoll = async (question: string, options: string[], deadline: number) => {
    if (!address && typeof window === 'undefined') {
      throw new Error("Environment not available");
    }

    const prePollId = generatePrePollId(question);
    const optionCount = options.length;
    
    if (optionCount < 2 || optionCount > 6) {
      throw new Error("Poll must have between 2 and 6 options");
    }
    
    const params = { prePollId, optionCount, deadline };
    setPollParams(params);
    
    // Calculate the poll ID client-side
    const calculatedPollId = calculatePollId(params);
    
    // Convert string options to PollOption objects
    const pollOptions: PollOption[] = options.map((text, index) => ({
      id: index + 1,
      text
    }));
    
    // Store in localStorage
    const pollToStore: StoredPoll = {
      id: calculatedPollId,
      prePollId,
      question,
      options: pollOptions,
      deadline,
      optionCount,
      createdAt: Math.floor(Date.now() / 1000)
    };
    
    saveCreatedPoll(pollToStore);
    
    // If wallet is connected, create poll on chain
    if (address && isConnected && walletClient) {
      try {
        const hash = await walletClient.writeContract({
          address: POLL_CONTRACT_ADDRESS,
          abi: POLL_CONTRACT_ABI,
          functionName: 'createPoll',
          args: [prePollId, optionCount, BigInt(deadline)]
        });
        
        return hash;
      } catch (error) {
        console.error("Error creating poll on chain:", error);
        return null;
      }
    }
    
    return null;
  };

  /**
   * Vote on a poll
   * @param pollId - ID of the poll to vote on
   * @param optionId - ID of the option to vote for (1-based)
   * @returns Promise resolving to transaction hash
   */
  const vote = async (pollId: string, optionId: number) => {
    if (!address || !isConnected || !walletClient) {
      throw new Error("Wallet not connected");
    }
    
    // Get stored poll data to extract necessary parameters
    const storedPoll = getCreatedPollById(pollId);
    if (!storedPoll || !storedPoll.prePollId) {
      throw new Error("Poll data not found");
    }
    
    try {
      console.log(`Submitting vote for poll ID: ${pollId}, option: ${optionId}`);
      
      // Ensure prePollId is properly formatted
      const formattedPrePollId = storedPoll.prePollId.startsWith('0x') 
        ? storedPoll.prePollId as `0x${string}` 
        : `0x${storedPoll.prePollId}` as `0x${string}`;
      
      console.log(`Voting with params:`, {
        prePollId: formattedPrePollId,
        optionId,
        optionCount: storedPoll.optionCount,
        deadline: storedPoll.deadline
      });
      
      // Submit vote to blockchain
      const hash = await walletClient.writeContract({
        address: POLL_CONTRACT_ADDRESS,
        abi: POLL_CONTRACT_ABI,
        functionName: 'vote',
        args: [formattedPrePollId, optionId, storedPoll.optionCount, BigInt(storedPoll.deadline)]
      });
      
      console.log(`Vote submitted with hash: ${hash}`);
      
      // After successful vote, immediately refetch poll data
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to allow network propagation
      await refetchPoll(true);
      
      return hash;
    } catch (error) {
      console.error("Error voting:", error);
      throw error;
    }
  };

  /**
   * Set the current poll ID to query
   * @param id - The poll ID to query
   */
  const fetchPoll = (id: `0x${string}`) => {
    setPollId(id);
  };

  /**
   * Get vote result from blockchain
   * @param forceFetch - Force fetching from blockchain, bypassing cache
   * @returns Promise resolving to vote result
   */
  const getVoteResult = useCallback(async (forceFetch = false): Promise<{ hasVoted: boolean; optionId: number }> => {
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
  }, [pollData, address, makeChainRequest]);

  // Fetch poll data when pollId changes
  useEffect(() => {
    if (pollId) {
      refetchPoll(true);
    }
  }, [pollId, refetchPoll]);
  
  // Clear all caches periodically to prevent stale data
  useEffect(() => {
    const interval = setInterval(() => {
      // Clear retry counts to allow fresh attempts
      retryCountRef.current = {};
      
      // Clear contract cache every hour
      pollContract.clearCache();
    }, 60 * 60 * 1000); // 1 hour
    
    return () => clearInterval(interval);
  }, []);

  return {
    pollData,
    pollParams,
    isPollLoading,
    isPollError,
    setIsPollError,
    refetchPoll,
    createPoll,
    vote,
    fetchPoll,
    getVoteResult
  };
} 