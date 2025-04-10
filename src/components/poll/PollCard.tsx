"use client";

import React, { useState, useEffect, useRef } from "react";
import { Poll } from '@/utils/types';
import { usePoll } from '@/hooks/usePoll';
import { formatDeadline, formatDeadlineExact } from "../../utils/time-utils";
import { useAccount } from "wagmi";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { VoteOption } from "./VoteOption";
import { CircleCheck, XCircle, Download, MoreVertical, Eye, InfoIcon } from "lucide-react";
import VoteResults from "./VoteResults";
import { formatAddress } from "../../utils/reown";
import { getCreatedPollById } from "../../utils/localStorage";
import { exportPollToJson } from "../../utils/poll-utils";
import PollSystemInfoModal from "./PollSystemInfoModal";

interface PollCardProps {
  poll: Poll;
  className?: string;
  voteResult?: { hasVoted: boolean; optionId: number };
  onVoteSuccess?: () => void;
}

/**
 * PollCard component - displays a poll with voting options
 * @param poll - Poll data to display
 * @param className - Optional CSS class name
 * @param voteResult - Optional vote result data
 * @param onVoteSuccess - Optional callback function called after successful vote
 */
export function PollCard({ 
  poll, 
  className = "", 
  voteResult,
  onVoteSuccess
}: PollCardProps) {
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

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
  }, [voteResult]);

  useEffect(() => {
    // Format the deadline each time it updates
    setFormattedDeadline(formatDeadline(poll.deadline));
    setExactDeadline(formatDeadlineExact(poll.deadline));

    // Check if poll has ended
    const now = Math.floor(Date.now() / 1000);
    setPollHasEnded(now > poll.deadline);

    // Only check vote status from blockchain if no voteResult prop is provided
    // This ensures we don't override the parent component's vote result
    if (address && !voteResult) {
      let isFetching = true;
      const fetchVoteStatus = async () => {
        try {
          // Force a fresh fetch from the blockchain, bypassing any cache
          const result = await getVoteResult(true);
          
          if (isMounted.current && isFetching) { // Only update state if component is still mounted
            setVoteStatus(result);
            // If user has already voted, show results
            if (result.hasVoted) {
              setShowResults(true);
            }
          }
        } catch (error) {
          console.error("Error fetching vote status:", error);
          // Fallback to no vote
          if (isMounted.current && isFetching) {
            setVoteStatus({ hasVoted: false, optionId: 0 });
          }
        }
      };
      
      fetchVoteStatus();
      
      // Set a timeout to prevent endless polling
      const timeout = setTimeout(() => {
        isFetching = false;
      }, 10000);
      
      return () => {
        clearTimeout(timeout);
        isFetching = false;
      };
    }

    // Always refetch poll data from chain to get latest votes
    if (isMounted.current) {
      refetchPoll(true);
    }
  }, [poll, getVoteResult, address, refetchPoll, voteResult]);

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
      await vote(poll.id, selectedOption);
      
      // Update local vote status
      setVoteStatus({
        hasVoted: true,
        optionId: selectedOption
      });
      
      // Show results after successful vote
      setShowResults(true);
      
      // Call the success callback if provided
      if (onVoteSuccess) {
        onVoteSuccess();
      }
    } catch (error) {
      console.error("Error voting:", error);
      setVoteError("Failed to submit vote. Please try again.");
    } finally {
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
      <Card className={`w-full max-w-md mx-auto overflow-hidden ${className}`}>
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
                <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-20">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    {!voteStatus.hasVoted && !showResults && (
                      <button
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={handleViewResults}
                        role="menuitem"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Results
                      </button>
                    )}
                    <button
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={handleExportPoll}
                      role="menuitem"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Poll
                    </button>
                    <button
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={handleViewSystemInfo}
                      role="menuitem"
                    >
                      <InfoIcon className="h-4 w-4 mr-2" />
                      System Info
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
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
          {voteStatus.hasVoted || showResults ? (
            <div className="relative">
              <VoteResults poll={poll} userVoteOptionId={voteStatus.optionId} />
              {showResults && !voteStatus.hasVoted && (
                <div className="mt-2 text-center text-sm text-gray-500">
                  <p>Viewing results without voting</p>
                </div>
              )}
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
              {poll.options.map((option) => (
                <VoteOption
                  key={option.id}
                  option={option.text}
                  optionId={option.id}
                  isSelected={selectedOption === option.id}
                  onSelect={handleOptionSelect}
                  disabled={isVoting || pollHasEnded || voteStatus.hasVoted}
                />
              ))}

              {voteError && <div className="text-red-500 text-sm mt-2">{voteError}</div>}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col px-8 pb-4 gap-2">
          {!voteStatus.hasVoted && !showResults && !pollHasEnded && isConnected && (
            <Button
              className="w-full"
              onClick={handleVoteSubmit}
              disabled={!selectedOption || isVoting || !address || pollHasEnded}
            >
              {isVoting ? "Submitting..." : "Vote"}
            </Button>
          )}

          {(!voteStatus.hasVoted && !showResults && pollHasEnded) && (
            <Button className="w-full" disabled>
              Poll has ended
            </Button>
          )}
          
          {(voteStatus.hasVoted || showResults) && (
            <div className="w-full text-center text-sm text-gray-500">
              {voteStatus.hasVoted ? "Thank you for voting!" : ""}
            </div>
          )}

          {isConnected && address && (
            <div className="w-full text-center text-xs font-mono text-base-purple mt-2">
              {formatAddress(address)}
            </div>
          )}
        </CardFooter>
      </Card>
      
      {/* System Info Modal */}
      <PollSystemInfoModal
        poll={poll}
        isOpen={showSystemInfo}
        onClose={() => setShowSystemInfo(false)}
      />
    </>
  );
}

export default PollCard; 