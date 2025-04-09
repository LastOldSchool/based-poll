"use client";

import { useState, useEffect } from "react";
import { formatDate, isPollEnded as isEndedUtil } from "../../utils/poll-utils";
import { Poll, VoteResult } from "../../utils/types";
import PollOption from "./PollOption";
import Button from "../ui/Button";
import { usePoll } from "../../hooks/usePoll";

interface PollCardProps {
  poll: Poll;
  voteResult?: VoteResult;
}

/**
 * Poll card component displaying a poll with voting options
 */
export default function PollCard({ poll, voteResult }: PollCardProps) {
  // Use local state instead of wallet hooks
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { vote } = usePoll();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState<boolean>(!!voteResult?.hasVoted);
  const [userVoteOption, setUserVoteOption] = useState<number>(voteResult?.optionId || 0);
  const [pollHasEnded, setPollHasEnded] = useState(false);
  const [formattedDeadline, setFormattedDeadline] = useState("");
  const [totalVotes, setTotalVotes] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Calculate browser-dependent values in useEffect to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    
    // Calculate if poll has ended
    setPollHasEnded(isEndedUtil(poll.deadline));
    
    // Format the deadline date
    setFormattedDeadline(formatDate(poll.deadline));
    
    // Calculate total votes
    const votes = poll.voteCounts.reduce((sum, count) => sum + count, 0);
    setTotalVotes(votes);
    
    // Simulate connected wallet
    setIsConnected(true);
    setAddress("0x1234567890123456789012345678901234567890");
  }, [poll.deadline, poll.voteCounts]);

  const handleOptionClick = (id: number) => {
    if (!isConnected || hasVoted || pollHasEnded) return;
    setSelectedOption(id);
  };

  const handleVote = async () => {
    if (!selectedOption || !isConnected || !address) return;
    
    setIsVoting(true);
    setErrorMessage(null);
    
    try {
      await vote();
      setHasVoted(true);
      setUserVoteOption(selectedOption);
    } catch (error) {
      console.error("Error voting:", error);
      setErrorMessage("Failed to submit vote. Please try again.");
    } finally {
      setIsVoting(false);
    }
  };

  // Server-side safe render with placeholder values
  const renderVotingUI = () => {
    if (!mounted) {
      return (
        <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          Loading...
        </div>
      );
    }

    if (!isConnected) {
      return (
        <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          Connect your wallet to vote
        </div>
      );
    } 
    
    if (pollHasEnded) {
      return (
        <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          This poll has ended
        </div>
      );
    } 
    
    if (hasVoted) {
      return (
        <div className="text-center p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-lg">
          You voted for option {userVoteOption}
        </div>
      );
    }
    
    return (
      <Button
        onClick={handleVote}
        disabled={!selectedOption || isVoting}
        isLoading={isVoting}
        variant={selectedOption ? "primary" : "outline"}
        fullWidth
      >
        {isVoting ? "Submitting..." : "Submit Vote"}
      </Button>
    );
  };

  return (
    <div className="bg-white dark:bg-base-dark border border-gray-200 dark:border-gray-800 rounded-xl p-5 md:p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-2">{poll.question}</h2>
        <div className="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>
            {mounted && pollHasEnded ? "Ended on" : "Ends on"}: {mounted ? formattedDeadline : "..."}
          </span>
          <span className="hidden md:inline">•</span>
          <span>{mounted ? totalVotes : "..."} votes</span>
        </div>
      </div>

      <div className="mb-6">
        {poll.options.map((option, index) => (
          <PollOption
            key={index}
            id={index + 1}
            text={option}
            voteCount={poll.voteCounts[index] || 0}
            totalVotes={totalVotes}
            selected={selectedOption === index + 1}
            disabled={!mounted || !isConnected || isVoting || pollHasEnded}
            onClick={handleOptionClick}
            hasVoted={mounted && hasVoted}
            userVote={userVoteOption}
          />
        ))}
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col space-y-3">
        {renderVotingUI()}
      </div>
    </div>
  );
} 