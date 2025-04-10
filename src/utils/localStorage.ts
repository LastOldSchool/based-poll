/**
 * Local storage keys used in the application
 */
export const LS_KEYS = {
  CREATED_POLLS: 'basedpoll_created_polls'
};

/**
 * Interface for poll data stored in localStorage
 */
export interface StoredPoll {
  id: string;
  prePollId: string;
  question: string;
  options: { id: number; text: string }[];
  deadline: number;
  optionCount: number;
  createdAt: number;
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
    
    const polls = JSON.parse(pollsJson) as StoredPoll[];
    
    // Backward compatibility: convert string[] options to object[] if needed
    return polls.map(poll => {
      if (poll.options && Array.isArray(poll.options)) {
        // Check if options are already in the correct format
        if (poll.options.length > 0 && typeof poll.options[0] === 'object' && 'id' in poll.options[0]) {
          return poll;
        }
        
        // Convert string[] to { id: number, text: string }[]
        return {
          ...poll,
          options: (poll.options as unknown as string[]).map((text, index) => ({
            id: index + 1,
            text
          }))
        };
      }
      return poll;
    });
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
 * Clear all localStorage data
 */
export function clearLocalStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(LS_KEYS.CREATED_POLLS);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
} 