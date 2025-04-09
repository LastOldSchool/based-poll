/**
 * Local storage keys used in the application
 */
export const LS_KEYS = {
  CREATED_POLLS: 'basedpoll_created_polls',
  VOTED_POLLS: 'basedpoll_voted_polls'
};

/**
 * Interface for poll data stored in localStorage
 */
export interface StoredPoll {
  id: string;
  prePollId: string;
  question: string;
  options: string[];
  deadline: number;
  optionCount: number;
  createdAt: number;
}

/**
 * Interface for vote data stored in localStorage
 */
export interface StoredVote {
  pollId: string;
  optionId: number;
  votedAt: number;
  walletAddress?: string; // Add wallet address to track votes per wallet
}

/**
 * Save a created poll to localStorage
 * @param poll - Poll data to save
 */
export function saveCreatedPoll(poll: StoredPoll): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Get existing polls
    const existingPolls = getCreatedPolls();
    
    // Add new poll (replace if exists)
    const updatedPolls = existingPolls.filter(p => p.id !== poll.id);
    updatedPolls.push(poll);
    
    // Save to localStorage
    localStorage.setItem(LS_KEYS.CREATED_POLLS, JSON.stringify(updatedPolls));
  } catch (error) {
    console.error('Failed to save poll to localStorage:', error);
  }
}

/**
 * Get all created polls from localStorage
 * @returns Array of stored polls
 */
export function getCreatedPolls(): StoredPoll[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const pollsJson = localStorage.getItem(LS_KEYS.CREATED_POLLS);
    if (!pollsJson) return [];
    
    return JSON.parse(pollsJson) as StoredPoll[];
  } catch (error) {
    console.error('Failed to get polls from localStorage:', error);
    return [];
  }
}

/**
 * Find a specific poll in localStorage by ID
 * @param pollId - ID of the poll to find
 * @returns Poll data if found, null otherwise
 */
export function getCreatedPollById(pollId: string): StoredPoll | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const polls = getCreatedPolls();
    return polls.find(p => p.id === pollId) || null;
  } catch (error) {
    console.error('Failed to get poll from localStorage:', error);
    return null;
  }
}

/**
 * Save a vote to localStorage
 * @param vote - Vote data to save
 */
export function saveVote(vote: StoredVote): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Get existing votes
    const existingVotes = getVotes();
    
    // Add new vote (replace if exists for this poll and wallet)
    const updatedVotes = existingVotes.filter(v => 
      !(v.pollId === vote.pollId && v.walletAddress === vote.walletAddress)
    );
    updatedVotes.push(vote);
    
    // Save to localStorage
    localStorage.setItem(LS_KEYS.VOTED_POLLS, JSON.stringify(updatedVotes));
  } catch (error) {
    console.error('Failed to save vote to localStorage:', error);
  }
}

/**
 * Get all votes from localStorage
 * @returns Array of stored votes
 */
export function getVotes(): StoredVote[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const votesJson = localStorage.getItem(LS_KEYS.VOTED_POLLS);
    if (!votesJson) return [];
    
    return JSON.parse(votesJson) as StoredVote[];
  } catch (error) {
    console.error('Failed to get votes from localStorage:', error);
    return [];
  }
}

/**
 * Check if user has voted on a specific poll
 * @param pollId - ID of the poll to check
 * @param walletAddress - Optional wallet address to check for
 * @returns Vote data if found, null otherwise
 */
export function getUserVoteForPoll(pollId: string, walletAddress?: string): StoredVote | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const votes = getVotes();
    
    if (walletAddress) {
      // Find a vote for this poll and this specific wallet
      return votes.find(v => v.pollId === pollId && v.walletAddress === walletAddress) || null;
    } else {
      // Just find any vote for this poll (backward compatibility)
      return votes.find(v => v.pollId === pollId) || null;
    }
  } catch (error) {
    console.error('Failed to get vote from localStorage:', error);
    return null;
  }
}

/**
 * Get all votes for a specific poll
 * @param pollId - ID of the poll to get votes for
 * @returns Array of votes for the poll
 */
export function getAllVotesForPoll(pollId: string): StoredVote[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const votes = getVotes();
    return votes.filter(v => v.pollId === pollId);
  } catch (error) {
    console.error('Failed to get votes from localStorage:', error);
    return [];
  }
}

/**
 * Get all wallet addresses that voted for a specific option in a poll
 * @param pollId - The ID of the poll
 * @param optionId - The ID of the option to get voters for
 * @returns Array of wallet addresses that voted for this option
 */
export function getUserVotesForOption(pollId: string, optionId: number): string[] {
  try {
    const allVotes = getAllVotesForPoll(pollId);
    
    // Filter votes to only include those for the specified option and return their wallet addresses
    return allVotes
      .filter(vote => vote.optionId === optionId && vote.walletAddress)
      .map(vote => vote.walletAddress)
      .filter((address): address is string => address !== null && address !== undefined);
  } catch (error) {
    console.error("Error getting user votes for option:", error);
    return [];
  }
}

/**
 * Clear all localStorage data
 */
export function clearLocalStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(LS_KEYS.CREATED_POLLS);
    localStorage.removeItem(LS_KEYS.VOTED_POLLS);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
} 