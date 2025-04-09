/**
 * Poll data structure
 */
export interface Poll {
  id: string;
  question: string;
  options: string[];
  deadline: number;
  voteCounts: number[];
  optionCount: number;
  exists: boolean;
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