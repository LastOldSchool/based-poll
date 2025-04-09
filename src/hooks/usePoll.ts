"use client";

import { useState } from "react";
import { generatePrePollId } from "../utils/poll-utils";
import { PollParams } from "../utils/types";

// Define a type for the poll data
interface PollData {
  exists: boolean;
  question: string;
  optionCount: number;
  deadline: number;
  voteCounts: number[];
}

// Mock function to simulate reading from a contract
const mockReadContract = async (): Promise<PollData> => {
  return {
    exists: true,
    question: "What is your favorite Base chain DApp?",
    optionCount: 5,
    deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    voteCounts: [42, 27, 35, 18, 10]
  };
};

// Mock function to simulate writing to a contract
const mockWriteContract = async (): Promise<{ hash: string }> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { hash: "0x" + Math.random().toString(16).substring(2) };
};

/**
 * Hook to interact with the poll contract
 */
export function usePoll() {
  const [pollParams, setPollParams] = useState<PollParams | null>(null);
  const [pollId, setPollId] = useState<`0x${string}` | null>(null);
  const [pollData, setPollData] = useState<PollData | null>(null);
  const [isPollLoading, setIsPollLoading] = useState(false);
  const [isPollError, setIsPollError] = useState(false);

  const refetchPoll = async () => {
    if (!pollId) return;
    
    setIsPollLoading(true);
    try {
      const data = await mockReadContract();
      setPollData(data);
      setIsPollError(false);
    } catch (error) {
      console.error("Error fetching poll:", error);
      setIsPollError(true);
    } finally {
      setIsPollLoading(false);
    }
  };

  /**
   * Create a new poll
   * @param question - The poll question
   * @param options - Array of poll options
   * @param deadline - Timestamp when the poll ends
   * @returns Promise resolving to transaction hash
   */
  const createPoll = async (question: string, options: string[], deadline: number) => {
    const prePollId = generatePrePollId(question);
    const optionCount = options.length;
    
    if (optionCount < 2 || optionCount > 6) {
      throw new Error("Poll must have between 2 and 6 options");
    }
    
    const params = { prePollId, optionCount, deadline };
    setPollParams(params);
    
    try {
      const result = await mockWriteContract();
      return result.hash;
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
  const vote = async () => {
    try {
      const result = await mockWriteContract();
      return result.hash;
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
    refetchPoll,
    createPoll,
    vote,
    fetchPoll,
  };
} 