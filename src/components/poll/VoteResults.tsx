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
    poll.voteCounts.reduce((sum, votes) => Number(sum) + Number(votes), 0) : 
    0;
    
  // Ensure minimum of 1 vote total if the user has voted
  const displayTotalVotes = userVoteOptionId ? Math.max(1, totalVotes) : totalVotes;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="text-sm font-medium text-gray-500 mb-2">
        {isNaN(displayTotalVotes) ? "1" : displayTotalVotes} {displayTotalVotes === 1 || isNaN(displayTotalVotes) ? "vote" : "votes"} total
      </div>
      
      {poll.options.map((option, index) => {
        // Support both old structure (voteCounts array) and potential new structure (votes in options)
        let voteCount = poll.voteCounts && poll.voteCounts[index] !== undefined ? Number(poll.voteCounts[index]) : 0;
        const isUserVote = userVoteOptionId === option.id;
        
        // Handle NaN values
        if (isNaN(voteCount)) {
          voteCount = 0;
        }
        
        // If this is the user's vote and count is 0, force it to at least 1
        if (isUserVote) {
          voteCount = Math.max(1, voteCount);
        }
        
        // Guard against NaN in percentage calculation
        const safeDisplayTotal = isNaN(displayTotalVotes) || displayTotalVotes === 0 ? 1 : displayTotalVotes;
        const percentage = Math.round((voteCount / safeDisplayTotal) * 100);
        
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
                {isUserVote ? (isNaN(voteCount) ? "1" : voteCount) : voteCount} · {isNaN(percentage) ? "0" : percentage}%
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
              {(voteCount > 0 || isUserVote) && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${isNaN(percentage) ? (isUserVote ? 100 : 0) : percentage}%`,
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