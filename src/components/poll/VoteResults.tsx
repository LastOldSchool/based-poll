"use client";

import React from "react";
import { cn } from '@/lib/utils';
import { Poll } from '@/utils/types';

interface VoteResultsProps {
  poll: Poll;
  userVoteOptionId?: number;
  className?: string;
}

/**
 * VoteResults component - displays the results of a poll with vote counts and percentages
 * @param poll - The poll data to display results for
 * @param userVoteOptionId - The option ID that the current user voted for (if any)
 * @param className - Additional class names to apply to the component
 */
export function VoteResults({ poll, userVoteOptionId, className }: VoteResultsProps) {
  // Calculate total votes by summing up all option votes
  // Support both old structure (voteCounts array) and potential new structure (votes in options)
  const totalVotes = poll.voteCounts ? 
    poll.voteCounts.reduce((sum, votes) => sum + votes, 0) : 
    0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="text-sm font-medium text-gray-500 mb-2">
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"} total
      </div>
      
      {poll.options.map((option, index) => {
        // Support both old structure (voteCounts array) and potential new structure (votes in options)
        const voteCount = poll.voteCounts ? poll.voteCounts[index] : 0;
        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
        const isUserVote = userVoteOptionId === option.id;
        
        return (
          <div 
            key={option.id} 
            className={cn(
              "space-y-1 relative",
              isUserVote && "p-3 my-2 rounded-md"
            )}
          >
            {/* Add a background highlight for user's vote */}
            {isUserVote && (
              <div className="absolute inset-0 -z-10 bg-green-50 dark:bg-green-900/10 rounded-md border border-green-200 dark:border-green-800/30"></div>
            )}
            
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className={cn(
                  "font-medium",
                  isUserVote ? "text-green-700" : "text-gray-700"
                )}>
                  {option.text} {isUserVote && (
                    <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Your vote
                    </span>
                  )}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {voteCount} · {percentage}%
              </div>
            </div>
            
            {/* Pure inline style progress bar */}
            <div 
              style={{ 
                height: '8px', 
                width: '100%', 
                backgroundColor: '#E5E7EB', 
                borderRadius: '4px',
                marginTop: '4px',
                marginBottom: '4px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {voteCount > 0 && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${percentage}%`,
                  backgroundColor: isUserVote ? '#10B981' : '#9CA3AF',
                  borderRadius: '4px',
                  minWidth: '4px',
                  boxShadow: isUserVote ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none'
                }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default VoteResults; 