"use client";

import { calculatePercentage } from "../../utils/poll-utils";

interface PollOptionProps {
  id: number;
  text: string;
  voteCount: number;
  totalVotes: number;
  selected: boolean;
  disabled: boolean;
  onClick: (id: number) => void;
  hasVoted: boolean;
  userVote: number;
}

/**
 * Poll option component for displaying voting options
 */
export default function PollOption({
  id,
  text,
  voteCount,
  totalVotes,
  selected,
  disabled,
  onClick,
  hasVoted,
  userVote,
}: PollOptionProps) {
  const percentage = totalVotes > 0 ? calculatePercentage(voteCount, totalVotes) : 0;
  const isVotedByUser = hasVoted && userVote === id;

  const displayPercentage = voteCount > 0 ? Math.max(1, percentage) : 0;
  const progressWidth = `${percentage}%`;

  return (
    <button
      onClick={() => onClick(id)}
      disabled={disabled || hasVoted}
      className={`relative w-full p-4 rounded-lg border mb-3 transition-all ${
        selected
          ? "border-base-blue bg-blue-50 dark:bg-blue-950/30"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      } ${isVotedByUser ? "border-base-purple bg-purple-50 dark:bg-purple-950/30" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div
            className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
              selected
                ? "border-base-blue bg-base-blue"
                : "border-gray-400 dark:border-gray-500"
            } ${isVotedByUser ? "border-base-purple bg-base-purple" : ""}`}
          >
            {selected && !isVotedByUser && (
              <div className="w-2 h-2 rounded-full bg-white dark:bg-white"></div>
            )}
            {isVotedByUser && (
              <div className="w-2 h-2 rounded-full bg-white dark:bg-white"></div>
            )}
          </div>
          <span className="font-medium text-left">{text}</span>
        </div>
        {hasVoted && (
          <span className="text-sm font-semibold">
            {voteCount} ({displayPercentage}%)
          </span>
        )}
      </div>
      
      {hasVoted && (
        <>
          <div className="absolute bottom-0 left-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-lg w-full"></div>
          {voteCount > 0 && (
            <div 
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-base-blue to-base-purple rounded-b-lg" 
              style={{ width: progressWidth }}
            ></div>
          )}
        </>
      )}
    </button>
  );
} 