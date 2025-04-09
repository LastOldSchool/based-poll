import { keccak256, stringToHex, encodeAbiParameters, parseAbiParameters, parseAbiItem } from "viem";
import { PublicClient } from "viem";

/**
 * Generate a pre-poll ID from poll question and options
 * @param question The poll question
 * @param options Array of poll options
 * @returns Promise resolving to the generated pre-poll ID
 */
export async function generatePrePollId(question: string, options: string[]): Promise<`0x${string}`> {
  // In a real application, this would be done off-chain, but we need it for testing
  return keccak256(stringToHex(`${question}:${options.join('|')}`));
}

/**
 * Calculate the actual poll ID as done in the contract
 * @param prePollId The preliminary poll ID
 * @param optionCount Number of options in the poll
 * @param deadline Poll deadline timestamp
 * @returns Promise resolving to the calculated poll ID
 */
export async function calculateActualPollId(
  prePollId: `0x${string}`, 
  optionCount: number, 
  deadline: bigint
): Promise<`0x${string}`> {
  // This should match the contract's calculateActualPollId function which uses abi.encode
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("bytes32, uint8, uint256"),
      [prePollId, optionCount, deadline]
    )
  );
}

/**
 * Get all voters for a specific poll option by querying events
 * @param publicClient The Viem public client
 * @param pollAddress The poll contract address
 * @param pollId The poll ID
 * @param optionId The option ID to get voters for (1-based)
 * @returns Promise resolving to array of voter addresses
 */
export async function getVotersForOption(
  publicClient: PublicClient,
  pollAddress: `0x${string}`,
  pollId: `0x${string}`,
  optionId: number
): Promise<`0x${string}`[]> {
  // Get all VoteCast events for this poll
  const voteEvents = await publicClient.getLogs({
    address: pollAddress,
    event: parseAbiItem('event VoteCast(bytes32 indexed pollId, address indexed voter, uint8 optionId)'),
    args: {
      pollId
    },
    fromBlock: 0n,
    toBlock: 'latest'
  });
  
  // Filter events to get only votes for the specified option
  const optionVoters = voteEvents
    .filter(event => {
      if (!event.args) return false;
      
      // Convert the optionId to a number for comparison
      const eventOptionId = typeof event.args.optionId === 'bigint' 
        ? Number(event.args.optionId) 
        : typeof event.args.optionId === 'number' 
          ? event.args.optionId 
          : null;
          
      return eventOptionId === optionId;
    })
    .map(event => {
      if (!event.args || !event.args.voter) return null;
      return event.args.voter as `0x${string}`;
    })
    .filter((address): address is `0x${string}` => address !== null);
    
  // Return unique voters
  return [...new Set(optionVoters)];
} 