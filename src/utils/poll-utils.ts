import { keccak256, stringToHex, toBytes } from "viem";
import { PollParams } from "./types";
import { StoredPoll } from "./localStorage";

/**
 * Generate a pre-poll ID from a question
 * @param question - The poll question
 * @returns The pre-poll ID as a hex string
 */
export function generatePrePollId(question: string): `0x${string}` {
  return keccak256(stringToHex(question));
}

/**
 * Format a date as a readable string
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted date string
 */
export function formatDate(timestamp: number): string {
  // Safe check for server-side rendering
  if (typeof window === 'undefined') {
    return new Date(timestamp * 1000).toISOString();
  }
  
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

/**
 * Check if a poll has ended
 * @param deadline - Poll deadline timestamp in seconds
 * @returns Whether the poll has ended
 */
export function isPollEnded(deadline: number): boolean {
  // Safe check for server-side rendering
  if (typeof window === 'undefined') {
    return false; // Default to not ended during SSR
  }
  
  const now = Math.floor(Date.now() / 1000);
  return now > deadline;
}

/**
 * Calculate the percentage of votes for an option
 * @param voteCount - Number of votes for this option
 * @param totalVotes - Total number of votes
 * @returns Percentage with 1 decimal place
 */
export function calculatePercentage(voteCount: number, totalVotes: number): number {
  if (totalVotes === 0) return 0;
  return Number(((voteCount / totalVotes) * 100).toFixed(1));
}

/**
 * Calculate the actual poll ID from parameters
 * @param params - Poll parameters
 * @returns The calculated poll ID
 */
export function calculatePollId(params: PollParams): `0x${string}` {
  const encoded = toBytes(
    JSON.stringify({
      prePollId: params.prePollId,
      optionCount: params.optionCount,
      deadline: params.deadline
    })
  );
  return keccak256(encoded);
}

/**
 * Export a poll to JSON format
 * @param poll - The poll to export
 * @returns JSON string representation of the poll
 */
export function exportPollToJson(poll: StoredPoll): string {
  try {
    return JSON.stringify(poll, null, 2);
  } catch (error) {
    console.error('Failed to export poll:', error);
    throw new Error('Failed to export poll');
  }
}

/**
 * Import a poll from JSON
 * @param jsonData - JSON string representation of a poll
 * @returns The imported poll data
 */
export function importPollFromJson(jsonData: string): StoredPoll {
  try {
    const poll = JSON.parse(jsonData) as StoredPoll;
    
    // Validate required fields
    if (!poll.id || !poll.prePollId || !poll.question || !Array.isArray(poll.options) || 
        poll.options.length < 2 || typeof poll.deadline !== 'number' || 
        typeof poll.optionCount !== 'number') {
      throw new Error('Invalid poll data format');
    }
    
    // Add creation timestamp if missing
    if (!poll.createdAt) {
      poll.createdAt = Math.floor(Date.now() / 1000);
    }
    
    return poll;
  } catch (error) {
    console.error('Failed to import poll:', error);
    throw new Error('Failed to import poll: Invalid JSON format');
  }
} 