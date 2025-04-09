"use client";

import { useState, useCallback } from "react";
import { generatePrePollId } from "../utils/poll-utils";
import { PollParams, Poll } from "../utils/types";
import { pollContract } from "../utils/contract";
import { useAccount, useWalletClient } from "wagmi";
import { POLL_CONTRACT_ABI, POLL_CONTRACT_ADDRESS } from "../utils/config";

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

  const refetchPoll = useCallback(async () => {
    if (!pollId) return;
    
    setIsPollLoading(true);
    try {
      const data = await pollContract.getPoll(pollId);
      setPollData(data);
      setIsPollError(false);
    } catch (error) {
      console.error("Error fetching poll:", error);
      setIsPollError(true);
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
    if (!address || !isConnected || !walletClient) {
      throw new Error("Wallet not connected");
    }

    const prePollId = generatePrePollId(question);
    const optionCount = options.length;
    
    if (optionCount < 2 || optionCount > 6) {
      throw new Error("Poll must have between 2 and 6 options");
    }
    
    const params = { prePollId, optionCount, deadline };
    setPollParams(params);
    
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
      console.error("Error creating poll:", error);
      throw error;
    }
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
    if (!address || !isConnected || !walletClient) {
      throw new Error("Wallet not connected");
    }
    
    const prePollId = generatePrePollId(question);
    
    try {
      // Use Viem to interact with the contract
      const hash = await walletClient.writeContract({
        address: POLL_CONTRACT_ADDRESS,
        abi: POLL_CONTRACT_ABI,
        functionName: 'vote',
        args: [prePollId, optionId, optionCount, BigInt(deadline)]
      });
      
      return hash;
    } catch (error) {
      console.error("Error voting on poll:", error);
      throw error;
    }
  };

  /**
   * Set the current poll ID to query
   * @param id - The poll ID to query
   */
  const fetchPoll = (id: `0x${string}`) => {
    setPollId(id);
    refetchPoll();
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
  };
} 