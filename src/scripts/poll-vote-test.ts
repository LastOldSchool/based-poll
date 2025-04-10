/**
 * TypeScript test to check if a wallet has voted on a specific poll
 * Run with: npx ts-node src/tests/poll-vote-test.ts
 */

// Use CommonJS require instead of ES module imports
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Poll contract address on Base
const POLL_CONTRACT_ADDRESS = '0xbfa35d934c83a2b453914bbabde41758632255f3';

// Poll and voter data for testing
const POLL_IDS = [
  "0xe2917660ad2ed35439220816f6d0a6a3a622ce8f719a73e09617167a7974aa8c"
];
const VOTER_ADDRESS = "0x0c62f675D99ec676D6533cd25CF3B55F0671edCf";

// Get RPC URL from environment variables with fallbacks
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

// Define interfaces for TypeScript
interface VoteResult {
  success: boolean;
  hasVoted: boolean;
  optionId: number;
  error?: string;
}

interface PollData {
  exists: boolean;
  deadline: number;
  optionCount: number;
  voteCounts: number[];
}

/**
 * Formats an address to ensure it's a valid Ethereum address
 * @param address The address to format
 * @returns The formatted address
 */
function formatAddress(address: string): string {
  if (!address.startsWith('0x')) {
    return '0x' + address;
  }
  return address;
}

/**
 * Makes an RPC call to the blockchain
 * @param method The JSON-RPC method to call
 * @param params The parameters for the RPC method
 * @returns A promise that resolves to the RPC response
 */
async function makeRpcCall(method: string, params: any[]): Promise<any> {
  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`RPC Error: ${JSON.stringify(data.error)}`);
    }
    
    return data.result;
  } catch (error) {
    console.error(`RPC call failed: ${error}`);
    throw error;
  }
}

/**
 * Checks if the contract exists on the blockchain
 * @param contractAddress The address of the contract to check
 * @returns A promise that resolves to a boolean indicating if the contract exists
 */
async function checkContractExists(contractAddress: string): Promise<boolean> {
  try {
    const code = await makeRpcCall('eth_getCode', [contractAddress, 'latest']);
    return code !== '0x' && code !== '0x0';
  } catch (error) {
    console.error(`Error checking contract: ${error}`);
    return false;
  }
}

/**
 * Gets poll data from the blockchain
 * @param pollId The ID of the poll to retrieve
 * @returns A promise that resolves to the poll data
 */
async function getPollData(pollId: string): Promise<PollData | null> {
  try {
    // Function selector for getPoll(bytes32)
    const functionSelector = '0x2cbbd738';
    
    // Encode the poll ID parameter
    const pollIdWithout0x = pollId.startsWith('0x') ? pollId.slice(2) : pollId;
    
    // Create the call data
    const data = functionSelector + pollIdWithout0x;
    
    const result = await makeRpcCall('eth_call', [{
      to: POLL_CONTRACT_ADDRESS,
      data,
    }, 'latest']);
    
    if (result === '0x' || result === '0x0') {
      console.log(`No poll data found for ID: ${pollId}`);
      return null;
    }
    
    return decodePollData(result);
  } catch (error) {
    console.error(`Error getting poll data: ${error}`);
    return null;
  }
}

/**
 * Decodes poll data from the blockchain response
 * @param data The encoded poll data from the blockchain
 * @returns The decoded poll data
 */
function decodePollData(data: string): PollData {
  try {
    // Remove 0x prefix
    const hexData = data.slice(2);
    
    // Extract the fixed-size fields first
    const deadline = parseInt(hexData.slice(0, 64), 16);
    const optionCount = parseInt(hexData.slice(128, 192), 16);
    const exists = parseInt(hexData.slice(192, 256), 16) !== 0;
    
    // The second 32 bytes contains the offset to the voteCounts array
    const arrayDataOffset = parseInt(hexData.slice(64, 128), 16) * 2; // Convert bytes to hex chars
    
    // Validate poll existence
    if (!exists) {
      return { exists, deadline, optionCount, voteCounts: [] };
    }
    
    // The array data starts at the offset from the beginning of the return data
    const voteCounts: number[] = [];
    
    // First 32 bytes at the array offset is the array length
    const arrayLenPos = arrayDataOffset;
    if (arrayLenPos + 64 <= hexData.length) {
      const arrayLen = parseInt(hexData.slice(arrayLenPos, arrayLenPos + 64), 16);
      
      // Read each array element (each is 32 bytes)
      for (let i = 0; i < arrayLen && i < optionCount; i++) {
        const pos = arrayLenPos + 64 + (i * 64);
        if (pos + 64 <= hexData.length) {
          const voteCount = parseInt(hexData.slice(pos, pos + 64), 16);
          voteCounts.push(voteCount);
        } else {
          break;
        }
      }
    }
    
    return {
      exists,
      deadline,
      optionCount,
      voteCounts
    };
  } catch (error) {
    console.error(`Error decoding poll data: ${error}`);
    return {
      exists: false,
      deadline: 0,
      optionCount: 0,
      voteCounts: [],
    };
  }
}

/**
 * Checks if a wallet has voted on a specific poll
 * @param pollId The ID of the poll to check
 * @param voter The address of the voter to check
 * @returns A promise that resolves to the vote result
 */
async function checkVote(pollId: string, voter: string): Promise<VoteResult> {
  try {
    // The correct function selector for checkVote(bytes32,address)
    const functionSelector = '0xf0786562';
    
    // Encode the parameters correctly
    // For bytes32 (poll ID), remove 0x and use the full 32 bytes
    const pollIdWithout0x = pollId.startsWith('0x') ? pollId.slice(2) : pollId;
    
    // For address, remove 0x and pad to 32 bytes (64 hex chars) on the left
    const formattedVoter = formatAddress(voter);
    const addressWithout0x = formattedVoter.slice(2).toLowerCase();
    const paddedAddress = addressWithout0x.padStart(64, '0');
    
    // Create the call data: function selector + pollId + padded address
    const data = functionSelector + pollIdWithout0x + paddedAddress;
    
    const result = await makeRpcCall('eth_call', [{
      to: POLL_CONTRACT_ADDRESS,
      data,
    }, 'latest']);
    
    if (result === '0x' || result === '0x0') {
      return { 
        success: false, 
        hasVoted: false, 
        optionId: 0, 
        error: 'No result returned'
      };
    }
    
    // Decode the result
    // First 32 bytes (64 hex chars) is the hasVoted boolean
    // Next 32 bytes is the optionId
    const hexResult = result.slice(2);
    const hasVoted = parseInt(hexResult.slice(0, 64), 16) !== 0;
    const optionId = parseInt(hexResult.slice(64, 128), 16);
    
    return {
      success: true,
      hasVoted,
      optionId
    };
  } catch (error) {
    return {
      success: false,
      hasVoted: false,
      optionId: 0,
      error: `Check vote failed: ${error}`
    };
  }
}

/**
 * Runs the vote test for a given poll ID and voter
 * @param pollId The ID of the poll to test
 * @param voter The address of the voter to test
 */
async function runVoteTest(pollId: string, voter: string): Promise<void> {
  console.log(`\n===== Testing vote for poll ID: ${pollId} =====`);
  
  // Get poll data
  const pollData = await getPollData(pollId);
  if (!pollData || !pollData.exists) {
    console.log("Poll does not exist or could not be retrieved");
    return;
  }
  
  // Check vote
  console.log(`Checking vote for address: ${voter}`);
  const voteResult = await checkVote(pollId, voter);
  
  if (voteResult.success) {
    console.log(`Vote check successful!`);
    console.log(`Has ${voteResult.hasVoted ? 'voted' : 'not voted'} on this poll.`);
    if (voteResult.hasVoted) {
      console.log(`Voted for option ID: ${voteResult.optionId}`);
    }
  } else {
    console.log(`Vote check failed: ${voteResult.error}`);
  }
  
  // Display poll summary
  console.log("\n----- Poll Summary -----");
  console.log(`Total options: ${pollData.optionCount}`);
  
  // Format deadline timestamp 
  const deadlineDate = new Date(pollData.deadline * 1000);
  console.log(`Poll deadline: ${deadlineDate.toLocaleString()}`);
  
  // Only show the actual number of options based on optionCount
  console.log(`\nVotes per option:`);
  const actualVoteCounts = pollData.voteCounts.slice(0, pollData.optionCount);
  const totalVotes = actualVoteCounts.reduce((sum, count) => sum + count, 0);
  console.log(`Total votes: ${totalVotes}`);
  
  for (let i = 0; i < pollData.optionCount; i++) {
    const count = i < actualVoteCounts.length ? actualVoteCounts[i] : 0;
    const percentage = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(2) : "0.00";
    console.log(`Option ${i + 1}: ${count} votes (${percentage}%)`);
  }
}

// Main function
async function main(): Promise<void> {
  console.log("=== Poll Vote Test Script ===");
  console.log(`Using RPC URL: ${RPC_URL}`);
  console.log(`Contract Address: ${POLL_CONTRACT_ADDRESS}`);
  
  // Check if contract exists
  const contractExists = await checkContractExists(POLL_CONTRACT_ADDRESS);
  console.log(`Contract exists: ${contractExists}`);
  
  if (!contractExists) {
    console.error("Contract not found at the specified address!");
    return;
  }
  
  // Test each poll ID
  for (const pollId of POLL_IDS) {
    await runVoteTest(pollId, VOTER_ADDRESS);
  }
}

// Run the main function
main().catch(error => {
  console.error("Critical error in main function:", error);
}); 