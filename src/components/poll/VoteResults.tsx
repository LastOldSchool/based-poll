"use client";

import React from "react";
import { cn } from "../../lib/utils";
import { Poll } from "../../utils/types";

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
  const totalVotes = poll.voteCounts.reduce((sum, count) => sum + count, 0);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="text-sm font-medium text-gray-500 mb-2">
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"} total
      </div>
      
      {poll.options.map((option, index) => {
        const voteCount = poll.voteCounts[index];
        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
        
        // The option index is 0-based but userVoteOptionId is 1-based
        // So we need to check if userVoteOptionId equals index+1
        const isUserVote = userVoteOptionId === index + 1;
        
        return (
          <div key={index} className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className={cn(
                  "font-medium",
                  isUserVote ? "text-primary" : "text-gray-700"
                )}>
                  {option} {isUserVote && "(Your vote)"}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {voteCount} · {percentage}%
              </div>
            </div>
            
            {/* Pure inline style progress bar */}
            <div style={{ 
              height: '8px', 
              width: '100%', 
              backgroundColor: '#E5E7EB', 
              borderRadius: '4px',
              marginTop: '4px',
              marginBottom: '4px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {voteCount > 0 && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${percentage}%`,
                  backgroundColor: isUserVote ? '#A855F7' : '#9CA3AF',
                  borderRadius: '4px',
                  minWidth: '4px'
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