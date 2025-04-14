/**
 * Poll option structure - represents a single option in a poll
 */
export interface PollOption {
  id: number;
  text: string;
}

/**
 * Poll data structure
 */
export interface Poll {
  id: `0x${string}`;
  question: string;
  deadline: number;
  options: PollOption[];
  voteCounts: number[];
  optionCount: number;
  exists: boolean;
  prePollId?: `0x${string}`;
}

/**
 * Vote result structure
 */
export interface VoteResult {
  hasVoted: boolean;
  optionId: number;
}

/**
 * Poll params needed to create or vote
 */
export interface PollParams {
  prePollId: `0x${string}`;
  optionCount: number;
  deadline: number;
}

/**
 * Poll creation input
 */
export interface CreatePollInput {
  question: string;
  options: string[];
  deadline: Date;
}

/**
 * Interface for poll data (was previously stored in localStorage)
 */
export interface StoredPoll {
  id: string;
  prePollId: string;
  question: string;
  options: { id: number; text: string }[];
  deadline: number;
}
