"use client";

import { useState, useCallback, useEffect } from "react";
import { PollParams, Poll } from '@/utils/types';
import { useAccount, useWalletClient } from "wagmi";
import { pollContract } from '@/utils/contract';
import { usePollRequestManager } from './pollRequestManager';
import { fetchPollData, getVoteResult as fetchVoteResult } from './pollDataFetcher';
import { createPoll as createPollAction, vote as voteAction } from './pollActions';

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
  const { makeChainRequest, clearCaches } = usePollRequestManager();

  /**
   * Refetch poll data from blockchain or local storage
   * @param forceFetch - Whether to force fetching from blockchain, bypassing cache
   */
  const refetchPoll = useCallback(async (forceFetch = false) => {
    if (!pollId) return;
    
    setIsPollLoading(true);
    
    try {
      const { pollData: fetchedData, isPollError: fetchError } = await fetchPollData(
        pollId,
        makeChainRequest,
        forceFetch
      );
      
      setPollData(fetchedData);
      setIsPollError(fetchError);
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
    // We'll set pollParams after getting the pre-poll id from createPollAction
    const result = await createPollAction(
      address,
      isConnected,
      walletClient,
      question,
      options,
      deadline
    );
    
    // After successful creation, update pollParams
    if (result) {
      const params: PollParams = {
        prePollId: '' as `0x${string}`, // This will be properly set when needed
        optionCount: options.length,
        deadline: deadline
      };
      setPollParams(params);
    }
    
    return result;
  };

  /**
   * Vote on a poll
   * @param pollId - ID of the poll to vote on
   * @param optionId - ID of the option to vote for (1-based)
   * @returns Promise resolving to transaction hash
   */
  const vote = async (votePollId: string, optionId: number) => {
    const currentPollId = pollId; // Capture current value to use in callback
    
    return await voteAction(
      address,
      isConnected,
      walletClient,
      votePollId,
      optionId,
      async () => {
        // After successful vote, immediately refetch poll data
        if (votePollId === currentPollId) {
          await refetchPoll(true);
        }
      }
    );
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
  const getVoteResult = useCallback(async (forceFetch = false) => {
    return await fetchVoteResult(pollData, address, makeChainRequest, forceFetch);
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
      clearCaches();
      
      // Clear contract cache every hour
      pollContract.clearCache();
    }, 60 * 60 * 1000); // 1 hour
    
    return () => clearInterval(interval);
  }, [clearCaches]);

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