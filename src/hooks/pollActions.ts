"use client";

import { generatePrePollId } from "@/utils/poll-utils";
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
 * Creates a new poll on the blockchain if wallet is connected
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
      // Return null silently without logging
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
 * @param prePollId - Pre-poll ID used to calculate the actual poll ID
 * @param optionCount - Number of options in the poll
 * @param deadline - Poll deadline timestamp
 * @param onSuccess - Optional callback function to execute after successful vote
 * @returns Promise resolving to transaction hash
 */
export async function vote(
  address: `0x${string}` | undefined,
  isConnected: boolean,
  walletClient: WalletClient | undefined,
  pollId: string,
  optionId: number,
  prePollId: string,
  optionCount: number,
  deadline: number,
  onSuccess?: () => Promise<void>
) {
  if (!address || !isConnected || !walletClient) {
    throw new Error("Wallet not connected");
  }

  if (!prePollId) {
    throw new Error("Pre-poll ID is required");
  }

  try {
    // Ensure prePollId is properly formatted
    const formattedPrePollId = prePollId.startsWith("0x")
      ? (prePollId as `0x${string}`)
      : (`0x${prePollId}` as `0x${string}`);

    // Submit vote to blockchain
    const hash = await walletClient.writeContract({
      address: POLL_CONTRACT_ADDRESS,
      abi: POLL_CONTRACT_ABI,
      functionName: "vote",
      args: [
        formattedPrePollId,
        optionId,
        optionCount,
        BigInt(deadline),
      ],
    });

    // After successful vote, immediately refetch poll data
    if (onSuccess) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay to allow network propagation
      await onSuccess();
    }

    return hash;
  } catch (error) {
    // Silently throw the error without logging
    throw error;
  }
} 