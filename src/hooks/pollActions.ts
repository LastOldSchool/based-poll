"use client";

import { PollOption } from "@/utils/types";
import { generatePrePollId, calculatePollId } from "@/utils/poll-utils";
import { saveCreatedPoll, getCreatedPollById, StoredPoll } from "@/utils/localStorage";
import { POLL_CONTRACT_ABI, POLL_CONTRACT_ADDRESS } from "@/utils/config";

// Define a simpler type for wallet client that matches the expected shape
type WalletClient = {
  writeContract: (params: {
    address: `0x${string}`;
    abi: readonly Record<string, unknown>[];
    functionName: string;
    args: readonly unknown[];
  }) => Promise<`0x${string}`>;
};

/**
 * Creates a new poll both locally and on the blockchain if wallet is connected
 * @param address - User's wallet address
 * @param isConnected - Whether wallet is connected
 * @param walletClient - Wagmi wallet client
 * @param question - The poll question
 * @param options - Array of poll option texts
 * @param deadline - Timestamp when the poll ends
 * @returns Promise resolving to transaction hash or null
 */
export async function createPoll(
  address: `0x${string}` | undefined,
  isConnected: boolean,
  walletClient: WalletClient | undefined,
  question: string,
  options: string[],
  deadline: number
) {
  if (!address && typeof window === "undefined") {
    throw new Error("Environment not available");
  }

  const prePollId = generatePrePollId(question);
  const optionCount = options.length;

  if (optionCount < 2 || optionCount > 6) {
    throw new Error("Poll must have between 2 and 6 options");
  }

  const params = { prePollId, optionCount, deadline };

  // Calculate the poll ID client-side
  const calculatedPollId = calculatePollId(params);

  // Convert string options to PollOption objects
  const pollOptions: PollOption[] = options.map((text, index) => ({
    id: index + 1,
    text,
  }));

  // Store in localStorage
  const pollToStore: StoredPoll = {
    id: calculatedPollId,
    prePollId,
    question,
    options: pollOptions,
    deadline,
    optionCount,
    createdAt: Math.floor(Date.now() / 1000),
  };

  saveCreatedPoll(pollToStore);

  // If wallet is connected, create poll on chain
  if (address && isConnected && walletClient) {
    try {
      const hash = await walletClient.writeContract({
        address: POLL_CONTRACT_ADDRESS,
        abi: POLL_CONTRACT_ABI,
        functionName: "createPoll",
        args: [prePollId, optionCount, BigInt(deadline)],
      });

      return hash;
    } catch (error) {
      console.error("Error creating poll on chain:", error);
      return null;
    }
  }

  return null;
}

/**
 * Vote on a poll
 * @param address - User's wallet address
 * @param isConnected - Whether wallet is connected
 * @param walletClient - Wagmi wallet client
 * @param pollId - ID of the poll to vote on
 * @param optionId - ID of the option to vote for (1-based)
 * @param onSuccess - Optional callback function to execute after successful vote
 * @returns Promise resolving to transaction hash
 */
export async function vote(
  address: `0x${string}` | undefined,
  isConnected: boolean,
  walletClient: WalletClient | undefined,
  pollId: string,
  optionId: number,
  onSuccess?: () => Promise<void>
) {
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
    const formattedPrePollId = storedPoll.prePollId.startsWith("0x")
      ? (storedPoll.prePollId as `0x${string}`)
      : (`0x${storedPoll.prePollId}` as `0x${string}`);

    console.log(`Voting with params:`, {
      prePollId: formattedPrePollId,
      optionId,
      optionCount: storedPoll.optionCount,
      deadline: storedPoll.deadline,
    });

    // Submit vote to blockchain
    const hash = await walletClient.writeContract({
      address: POLL_CONTRACT_ADDRESS,
      abi: POLL_CONTRACT_ABI,
      functionName: "vote",
      args: [
        formattedPrePollId,
        optionId,
        storedPoll.optionCount,
        BigInt(storedPoll.deadline),
      ],
    });

    console.log(`Vote submitted with hash: ${hash}`);

    // After successful vote, immediately refetch poll data
    if (onSuccess) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay to allow network propagation
      await onSuccess();
    }

    return hash;
  } catch (error) {
    console.error("Error voting:", error);
    throw error;
  }
} 