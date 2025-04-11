"use client";

import React, { useState, useEffect, useRef } from "react";
import { Poll } from '@/utils/types';
import { usePoll } from '@/hooks/usePoll';
import { formatDeadline, formatDeadlineExact } from '@/utils/time-utils';
import { useAccount } from "wagmi";
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { VoteOption } from "./VoteOption";
import { CircleCheck, MoreVertical, Eye, InfoIcon, Download } from "lucide-react";
import VoteResults from "./VoteResults";
import { formatAddress } from '@/utils/reown';
import { exportPollToJson } from '@/utils/poll-utils';
import PollSystemInfoModal from "./PollSystemInfoModal";
import ReownConnect from '@/components/ReownConnect';

interface PollCardProps {
  poll: Poll;
  className?: string;
  voteResult?: { hasVoted: boolean; optionId: number };
  onVoteSuccess?: (optionId: number) => void;
  /** Pre-poll ID used to calculate the poll ID */
  prePollId?: string;
}

/**
 * PollCard component - displays a poll with voting options
 * @param poll - Poll data to display
 * @param className - Optional CSS class name
 * @param voteResult - Optional vote result data
 * @param onVoteSuccess - Optional callback function called after successful vote
 * @param prePollId - Optional pre-poll ID
 */
export function PollCard({ 
  poll, 
  className = "", 
  voteResult,
  onVoteSuccess,
  prePollId
}: PollCardProps) {
  const { vote, refetchPoll } = usePoll();
  const { address, isConnected } = useAccount();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [pollHasEnded, setPollHasEnded] = useState(false);
  const [formattedDeadline, setFormattedDeadline] = useState("");
  const [exactDeadline, setExactDeadline] = useState("");
  const [voteStatus, setVoteStatus] = useState<{ hasVoted: boolean; optionId: number }>(
    voteResult || { hasVoted: false, optionId: 0 }
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);
  const [updatedPoll, setUpdatedPoll] = useState<Poll | null>(null);

  // Set isMounted to false when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle click outside to close menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update vote status when voteResult prop changes
  useEffect(() => {
    if (voteResult && isMounted.current) {
      setVoteStatus(voteResult);
      if (voteResult.hasVoted) {
        setShowResults(true);
      }
    }
  }, [voteResult, address]);

  useEffect(() => {
    // Format the deadline each time it updates
    setFormattedDeadline(formatDeadline(poll.deadline));
    setExactDeadline(formatDeadlineExact(poll.deadline));

    // Check if poll has ended
    const now = Math.floor(Date.now() / 1000);
    setPollHasEnded(now > poll.deadline);
    
    // Set the initial updated poll data
    setUpdatedPoll(poll);

    // Always refetch poll data from chain to get latest votes
    if (isMounted.current) {
      refetchPoll(true);
    }
  }, [poll, refetchPoll]);

  const handleOptionSelect = (optionId: number) => {
    setSelectedOption(optionId);
    setVoteError(null);
  };

  const handleVoteSubmit = async () => {
    if (!selectedOption) {
      setVoteError("Please select an option");
      return;
    }

    if (!isConnected || !address) {
      // No need to trigger wallet connect event, we'll show the connect button instead
      setVoteError("Please connect your wallet to vote");
      return;
    }

    if (pollHasEnded) {
      setVoteError("This poll has ended");
      return;
    }

    setIsVoting(true);
    setVoteError(null);

    try {
      // Use the provided prePollId if available, otherwise use the poll's prePollId
      const effectivePrePollId = prePollId || poll.prePollId;
      
      await vote(poll.id, selectedOption, effectivePrePollId, poll.optionCount, poll.deadline);
      
      // Optimistically update UI with the vote
      // 1. Update vote status
      const newVoteStatus = { hasVoted: true, optionId: selectedOption };
      setVoteStatus(newVoteStatus);

      // 2. Update vote counts in the local poll data
      const updatedVoteCounts = [...poll.voteCounts];
      updatedVoteCounts[selectedOption - 1] = updatedVoteCounts[selectedOption - 1] + 1;
      
      // 3. Set updated poll data with new vote counts
      const newPollData = {
        ...poll,
        voteCounts: updatedVoteCounts
      };
      setUpdatedPoll(newPollData);
      
      // Show results after successful vote
      setShowResults(true);
      
      // Call the success callback if provided, passing the selected option ID
      if (onVoteSuccess) {
        onVoteSuccess(selectedOption);
      }
    } catch {
      // Silently handle all errors without showing any messages
    } finally {
      setIsVoting(false);
    }
  };

  const handleExportPoll = () => {
    try {
      // Create a simplistic export without localStorage data
      const exportablePoll = {
        id: poll.id,
        prePollId: prePollId || "",
        question: poll.question,
        options: poll.options,
        deadline: poll.deadline,
        optionCount: poll.optionCount,
        createdAt: Math.floor(Date.now() / 1000)
      };
      
      // Convert poll to JSON
      const pollJson = exportPollToJson(exportablePoll);
      
      // Create a blob and download link
      const blob = new Blob([pollJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link element and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = `poll-${poll.id.slice(0, 8)}.json`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Close menu after export
      setMenuOpen(false);
    } catch (error) {
      console.error("Error exporting poll:", error);
      // You might want to show an error message to the user here
    }
  };
  
  const handleViewResults = () => {
    setShowResults(true);
    setMenuOpen(false);
  };
  
  const handleViewSystemInfo = () => {
    setShowSystemInfo(true);
    setMenuOpen(false);
  };

  return (
    <>
      <Card className={`w-full max-w-md mx-auto overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 ${className}`}>
        <CardHeader className="relative">
          <div className="absolute top-4 right-4 z-10">
            <div className="relative" ref={menuRef}>
              <button 
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Poll options"
              >
                <MoreVertical className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 z-20">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    {!voteStatus.hasVoted && !showResults && (
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        role="menuitem"
                        onClick={handleViewResults}
                      >
                        <span className="flex items-center">
                          <Eye className="mr-2 h-4 w-4" />
                          View Results
                        </span>
                      </button>
                    )}
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      role="menuitem"
                      onClick={handleExportPoll}
                    >
                      <span className="flex items-center">
                        <Download className="mr-2 h-4 w-4" />
                        Export Poll
                      </span>
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      role="menuitem"
                      onClick={handleViewSystemInfo}
                    >
                      <span className="flex items-center">
                        <InfoIcon className="mr-2 h-4 w-4" />
                        System Info
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <CardTitle className="text-xl font-bold">{poll.question}</CardTitle>
          <CardDescription>
            <span className="flex items-center mt-1">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                pollHasEnded
                  ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                  : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
              }`}>
                {pollHasEnded ? "Ended" : "Active"}
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-sm ml-2" title={exactDeadline}>
                {pollHasEnded ? "Ended" : "Ends"} {formattedDeadline}
              </span>
            </span>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {showResults ? (
            <VoteResults
              poll={updatedPoll || poll}
              userVoteOptionId={voteStatus.hasVoted ? voteStatus.optionId : undefined}
              className="mt-2"
            />
          ) : (
            <div className="space-y-3">
              {poll.options.map((option, idx) => (
                <VoteOption
                  key={idx}
                  id={idx + 1}
                  label={option.text}
                  selected={selectedOption === idx + 1}
                  onSelect={handleOptionSelect}
                  disabled={!isConnected || isVoting || pollHasEnded || voteStatus.hasVoted}
                />
              ))}
              
              {voteError && (
                <div className="text-red-500 text-sm mt-2">
                  {voteError}
                </div>
              )}
            </div>
          )}
          
          <div className="mt-5 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex justify-between items-center">
              <div>
                Total votes: <span className="font-medium text-gray-700 dark:text-gray-300">
                  {voteStatus.hasVoted ? 
                    "1" : 
                    (() => {
                      const totalVotes = (updatedPoll || poll).voteCounts?.reduce((sum, count) => 
                        Number(sum) + Number(count), 0
                      ) || 0;
                      return isNaN(totalVotes) ? "0" : totalVotes;
                    })()
                  }
                </span>
              </div>
              <div>
                Created by: <span className="font-medium text-gray-700 dark:text-gray-300">{formatAddress(poll.id.substring(0, 42))}</span>
              </div>
            </div>
          </div>
        </CardContent>
        
        {!showResults && !pollHasEnded && !voteStatus.hasVoted && (
          <CardFooter>
            {isConnected ? (
              <Button
                onClick={handleVoteSubmit}
                fullWidth
                isLoading={isVoting}
                disabled={!selectedOption || isVoting}
                className="shadow-sm hover:shadow-md transition-all duration-200"
              >
                Vote
              </Button>
            ) : (
              <div className="w-full">
                <ReownConnect fullWidth />
              </div>
            )}
          </CardFooter>
        )}
        
        {showResults && !voteStatus.hasVoted && !pollHasEnded && (
          <CardFooter>
            <Button
              onClick={() => setShowResults(false)}
              variant="outline"
              fullWidth
              className="shadow-sm hover:shadow-md transition-all duration-200"
            >
              Back to Vote
            </Button>
          </CardFooter>
        )}
        
        {voteStatus.hasVoted && (
          <CardFooter className="bg-green-50 dark:bg-green-900/20 py-3">
            <div className="w-full flex items-center justify-center text-green-700 dark:text-green-400">
              <CircleCheck className="h-5 w-5 mr-2" />
              <span>You voted for &quot;{voteStatus.optionId > 0 && voteStatus.optionId <= poll.options.length ? 
                poll.options[voteStatus.optionId - 1].text : 'your option'}&quot;</span>
            </div>
          </CardFooter>
        )}
        
        {pollHasEnded && !showResults && (
          <CardFooter>
            <Button
              onClick={() => setShowResults(true)}
              variant="outline"
              fullWidth
              className="shadow-sm hover:shadow-md transition-all duration-200"
            >
              View Results
            </Button>
          </CardFooter>
        )}
      </Card>
      
      {showSystemInfo && (
        <PollSystemInfoModal
          poll={poll}
          isOpen={showSystemInfo}
          onClose={() => setShowSystemInfo(false)}
          prePollId={prePollId}
        />
      )}
    </>
  );
}

export default PollCard; 