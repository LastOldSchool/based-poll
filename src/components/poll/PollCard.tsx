"use client";

import React, { useState, useEffect, useRef } from "react";
import { Poll } from '@/utils/types';
import { usePoll } from '@/hooks/usePoll';
import { formatDeadline, formatDeadlineExact } from "../../utils/time-utils";
import { useAccount } from "wagmi";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { VoteOption } from "./VoteOption";
import { CircleCheck, XCircle, Download } from "lucide-react";
import VoteResults from "./VoteResults";
import { formatAddress } from "../../utils/reown";
import { getCreatedPollById } from "../../utils/localStorage";
import { exportPollToJson } from "../../utils/poll-utils";

interface PollCardProps {
  poll: Poll;
  className?: string;
  voteResult?: { hasVoted: boolean; optionId: number };
}

/**
 * PollCard component - displays a poll with voting options
 * @param poll - Poll data to display
 * @param className - Optional CSS class name
 * @param voteResult - Optional vote result data
 */
export function PollCard({ poll, className = "", voteResult }: PollCardProps) {
  const { vote, getVoteResult, refetchPoll } = usePoll();
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
  const isMounted = useRef(true);

  // Set isMounted to false when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Format the deadline each time it updates
    setFormattedDeadline(formatDeadline(poll.deadline));
    setExactDeadline(formatDeadlineExact(poll.deadline));

    // Check if poll has ended
    const now = Math.floor(Date.now() / 1000);
    setPollHasEnded(now > poll.deadline);

    // Check if user has voted (use voteResult if provided, otherwise get from hook)
    if (voteResult) {
      setVoteStatus(voteResult);
    } else if (address) { // Only fetch if there's an address
      // Since getVoteResult is now async, we need to handle it with an async function
      const fetchVoteStatus = async () => {
        try {
          const result = await getVoteResult();
          if (isMounted.current) { // Only update state if component is still mounted
            setVoteStatus(result);
          }
        } catch (error) {
          console.error("Error fetching vote status:", error);
          // Fallback to no vote
          if (isMounted.current) {
            setVoteStatus({ hasVoted: false, optionId: 0 });
          }
        }
      };
      
      fetchVoteStatus();
    }
  }, [poll, getVoteResult, address, voteResult]);

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
      // Trigger the wallet connect event instead of showing an error
      window.dispatchEvent(new CustomEvent('connect-wallet'));
      return;
    }

    if (pollHasEnded) {
      setVoteError("This poll has ended");
      return;
    }

    setIsVoting(true);
    setVoteError(null);

    try {
      await vote(poll.question, selectedOption, poll.optionCount, poll.deadline);
      
      // After voting, update the vote status and refetch poll data
      const result = await getVoteResult();
      setVoteStatus(result);
      setIsVoting(false);
      
      // Refetch poll data to ensure vote counts are up to date
      await refetchPoll();
    } catch (error) {
      console.error("Error voting:", error);
      setVoteError("Failed to submit vote. Please try again.");
      setIsVoting(false);
    }
  };

  const handleExportPoll = () => {
    try {
      // Get the full stored poll data including prePollId
      const storedPoll = getCreatedPollById(poll.id);
      
      if (!storedPoll) {
        throw new Error("Poll data not found in local storage");
      }
      
      // Convert poll to JSON
      const pollJson = exportPollToJson(storedPoll);
      
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
    } catch (error) {
      console.error("Error exporting poll:", error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <Card className={`w-full max-w-md mx-auto overflow-hidden ${className}`}>
      <CardHeader>
        <CardTitle className="text-xl font-bold">{poll.question}</CardTitle>
        <CardDescription>
          {pollHasEnded ? (
            <span className="text-red-500 flex items-center gap-1">
              <XCircle className="h-4 w-4" />
              Poll ended {formattedDeadline}
            </span>
          ) : (
            <span 
              className="text-gray-400 flex items-center gap-1" 
              title={`Exact time remaining: ${exactDeadline}`}
            >
              <CircleCheck className="h-4 w-4" />
              Poll ends {formattedDeadline}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-8">
        {voteStatus.hasVoted ? (
          <div className="relative">
            <VoteResults poll={poll} userVoteOptionId={voteStatus.optionId} />
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-lg w-full text-center">
              <p>Please connect your wallet to vote in this poll.</p>
            </div>
            <Button 
              onClick={() => window.dispatchEvent(new CustomEvent('connect-wallet'))}
              variant="primary"
              fullWidth
            >
              Connect Wallet
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {poll.options.map((option, index) => (
              <VoteOption
                key={index}
                option={option}
                optionId={index + 1}
                isSelected={selectedOption === index + 1}
                onSelect={handleOptionSelect}
                disabled={isVoting || pollHasEnded}
              />
            ))}

            {voteError && <div className="text-red-500 text-sm mt-2">{voteError}</div>}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col px-8 pb-4 gap-2">
        {!voteStatus.hasVoted && !pollHasEnded && isConnected && (
          <Button
            className="w-full"
            onClick={handleVoteSubmit}
            disabled={!selectedOption || isVoting || !address || pollHasEnded}
          >
            {isVoting ? "Submitting..." : "Vote"}
          </Button>
        )}

        {(!voteStatus.hasVoted && pollHasEnded) && (
          <Button className="w-full" disabled>
            Poll has ended
          </Button>
        )}
        
        {voteStatus.hasVoted && (
          <div className="w-full text-center text-sm text-gray-500">
            Thank you for voting!
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={handleExportPoll}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Poll
        </Button>

        {isConnected && address && (
          <div className="w-full text-center text-xs font-mono text-base-purple mt-2">
            {formatAddress(address)}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default PollCard; 