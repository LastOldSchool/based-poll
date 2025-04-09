"use client";

import { useState, useCallback, useEffect } from "react";
import { generatePrePollId, calculatePollId } from "../utils/poll-utils";
import { PollParams, Poll } from "../utils/types";
import { pollContract } from "../utils/contract";
import { useAccount, useWalletClient } from "wagmi";
import { POLL_CONTRACT_ABI, POLL_CONTRACT_ADDRESS } from "../utils/config";
import { saveCreatedPoll, saveVote, getUserVoteForPoll, getCreatedPollById, getAllVotesForPoll, StoredPoll, StoredVote } from "../utils/localStorage";

/**
 * Hook to interact with the poll contract
 */
export function usePoll() {
  const [pollParams, setPollParams] = useState<PollParams | null>(null);
  const [pollId, setPollId] = useState<`0x${string}` | null>(null);
  const [pollData, setPollData] = useState<Poll | null>(null);
  const [isPollLoading, setIsPollLoading] = useState(false);
  const [isPollError, setIsPollError] = useState(false);
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [localVote, setLocalVote] = useState<StoredVote | null>(null);

  // Load local vote data when poll ID changes
  useEffect(() => {
    if (!pollId) return;
    
    // Only check votes for the current wallet address
    const userVote = getUserVoteForPoll(pollId, address);
    if (userVote) {
      setLocalVote(userVote);
    } else {
      setLocalVote(null);
    }
  }, [pollId, address]); // Add address as a dependency to re-check when wallet changes

  const refetchPoll = useCallback(async () => {
    if (!pollId) return;
    
    setIsPollLoading(true);
    try {
      // Try to get the poll from contract
      const data = await pollContract.getPoll(pollId);
      
      // Get all local votes for this poll to calculate totals
      const allVotes = getAllVotesForPoll(pollId);
      
      // Check if we have data from the contract
      if (data) {
        // If contract data is valid, use it
        setPollData(data);
        setIsPollError(false);
        setIsPollLoading(false);
        return;
      }
      
      // If no contract data but have localStorage data
      const localPoll = getCreatedPollById(pollId);
      if (localPoll) {
        // Create local poll data with all local votes combined
        const voteCounts = new Array(localPoll.optionCount).fill(0);
        
        // Count all votes for each option from local storage
        allVotes.forEach(vote => {
          if (vote.optionId > 0 && vote.optionId <= localPoll.optionCount) {
            voteCounts[vote.optionId - 1] += 1;
          }
        });
        
        const localPollData: Poll = {
          id: localPoll.id as `0x${string}`,
          question: localPoll.question,
          options: localPoll.options,
          deadline: localPoll.deadline,
          voteCounts: voteCounts,
          optionCount: localPoll.optionCount,
          exists: true
        };
        
        setPollData(localPollData);
        setIsPollError(false);
        setIsPollLoading(false);
        return;
      }
      
      // If we reach here, we have no data from any source
      setPollData(null);
      setIsPollError(true);
      
    } catch (error) {
      console.error("Error fetching poll:", error);
      
      // Try to get the poll from localStorage as fallback
      const localPoll = getCreatedPollById(pollId);
      
      if (localPoll) {
        // Get all local votes for this poll
        const allVotes = getAllVotesForPoll(pollId);
        
        // Create local poll data with all local votes combined
        const voteCounts = new Array(localPoll.optionCount).fill(0);
        
        // Count all votes for each option from local storage
        allVotes.forEach(vote => {
          if (vote.optionId > 0 && vote.optionId <= localPoll.optionCount) {
            voteCounts[vote.optionId - 1] += 1;
          }
        });
        
        const localPollData: Poll = {
          id: localPoll.id as `0x${string}`,
          question: localPoll.question,
          options: localPoll.options,
          deadline: localPoll.deadline,
          voteCounts: voteCounts,
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
  }, [pollId]);

  /**
   * Create a new poll
   * @param question - The poll question
   * @param options - Array of poll options
   * @param deadline - Timestamp when the poll ends
   * @returns Promise resolving to transaction hash
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
    
    // Store in localStorage
    const pollToStore: StoredPoll = {
      id: calculatedPollId,
      prePollId,
      question,
      options,
      deadline,
      optionCount,
      createdAt: Math.floor(Date.now() / 1000)
    };
    
    saveCreatedPoll(pollToStore);
    
    // If wallet is connected, try to create poll on chain
    if (address && isConnected && walletClient) {
      try {
        // Use Viem to interact with the contract
        const hash = await walletClient.writeContract({
          address: POLL_CONTRACT_ADDRESS,
          abi: POLL_CONTRACT_ABI,
          functionName: 'createPoll',
          args: [prePollId, optionCount, BigInt(deadline)]
        });
        
        return hash;
      } catch (error) {
        console.error("Error creating poll on chain:", error);
        // Continue with local storage only
        return null;
      }
    }
    
    return null;
  };

  /**
   * Vote on a poll
   * @param question - Poll question (used to generate prePollId)
   * @param optionId - ID of the option to vote for (1-based)
   * @param optionCount - Total number of options in the poll
   * @param deadline - Poll deadline timestamp
   * @returns Promise resolving to transaction hash
   */
  const vote = async (question: string, optionId: number, optionCount: number, deadline: number) => {
    const prePollId = generatePrePollId(question);
    
    // Calculate poll ID client-side
    const params = { prePollId, optionCount, deadline };
    const calculatedPollId = calculatePollId(params);
    
    // Store vote in localStorage with wallet address
    const voteToStore: StoredVote = {
      pollId: calculatedPollId,
      optionId,
      votedAt: Math.floor(Date.now() / 1000),
      walletAddress: address // Include the current wallet address
    };
    
    try {
      // Save vote to localStorage
      saveVote(voteToStore);
      setLocalVote(voteToStore);
      
      // If wallet is connected, try to vote on chain
      let hash = null;
      if (address && isConnected && walletClient) {
        try {
          // Use Viem to interact with the contract
          hash = await walletClient.writeContract({
            address: POLL_CONTRACT_ADDRESS,
            abi: POLL_CONTRACT_ABI,
            functionName: 'vote',
            args: [prePollId, optionId, optionCount, BigInt(deadline)]
          });
        } catch (error) {
          console.error("Error voting on chain:", error);
          // Continue with local storage only
        }
      }
      
      // Set the poll ID if it's not already set
      if (!pollId || pollId !== calculatedPollId) {
        setPollId(calculatedPollId as `0x${string}`);
      }
      
      // Refetch poll data to update vote counts
      await refetchPoll();
      
      return hash;
    } catch (error) {
      console.error("Error in vote function:", error);
      throw error;
    }
  };

  /**
   * Set the current poll ID to query
   * @param id - The poll ID to query
   */
  const fetchPoll = (id: `0x${string}`) => {
    setPollId(id);
    // Don't do refetchPoll here, it will be triggered by useEffect
  };

  // Add useEffect to trigger refetchPoll when pollId changes
  useEffect(() => {
    if (pollId) {
      refetchPoll();
    }
  }, [pollId, refetchPoll]);

  /**
   * Get vote result from localStorage or chain
   * Combines blockchain data with localStorage data
   */
  const getVoteResult = () => {
    if (!pollData || !address) return { hasVoted: false, optionId: 0 };
    
    // Check if the current wallet has voted on this poll
    const userVote = getUserVoteForPoll(pollData.id, address);
    if (userVote) {
      return { hasVoted: true, optionId: userVote.optionId };
    }
    
    return { hasVoted: false, optionId: 0 };
  };

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
    getVoteResult,
    localVote,
  };
} 