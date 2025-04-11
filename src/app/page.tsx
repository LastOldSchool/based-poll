"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import PollCard from "../components/poll/PollCard";
import Footer from "../components/Footer";
import { Poll } from "../utils/types";
import WalletConnect from "../components/WalletConnect";
import { generatePrePollId, calculatePollId } from "../utils/poll-utils";
import { pollContract } from "../utils/contract";
import { useAccount } from "wagmi";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [pollData, setPollData] = useState<Poll | null>(null);
  const [currentVoteResult, setCurrentVoteResult] = useState<{ hasVoted: boolean; optionId: number }>({ 
    hasVoted: false, 
    optionId: 0 
  });
  const [pollError, setPollError] = useState(false);
  const isMounted = useRef(true);
  const { address } = useAccount();
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Check vote status from blockchain
  const checkVoteStatus = useCallback(async (pollId: `0x${string}`) => {
    if (!address || !isMounted.current) return;
    
    try {
      // Always force fresh fetch from the blockchain
      const voteResult = await pollContract.checkVote(pollId, address as `0x${string}`, true);
      
      if (isMounted.current) {
        setCurrentVoteResult(voteResult);
      }
    } catch (error) {
      console.error("Error checking vote status:", error);
      if (isMounted.current) {
        setCurrentVoteResult({ hasVoted: false, optionId: 0 });
      }
    }
  }, [address]);
  
  // Load poll data from data.json and blockchain
  const loadPollData = useCallback(async () => {
    if (!isMounted.current) return;
    
    setIsLoading(true);
    setPollError(false);
    
    try {
      // Load poll from data.json
      const response = await fetch('/data.json');
      
      if (!response.ok) {
        throw new Error('Failed to fetch poll data');
      }
      
      const data = await response.json();
      
      // Calculate the prePollId and id dynamically
      const prePollId = generatePrePollId(data.question);
      const id = calculatePollId({
        prePollId,
        optionCount: data.optionCount,
        deadline: data.deadline
      });
      
      // Get actual poll data from blockchain
      const blockchainPoll = await pollContract.getPoll(id, true);
      const voteCounts = blockchainPoll?.voteCounts || Array(data.optionCount).fill(0);
      
      // Convert to Poll format
      const pollData: Poll = {
        id,
        question: data.question,
        deadline: data.deadline,
        options: data.options,
        optionCount: data.optionCount,
        voteCounts: voteCounts,
        exists: blockchainPoll?.exists || true,
        prePollId
      };
      
      if (isMounted.current) {
        setPollData(pollData);
        
        // Get vote status from blockchain if a wallet is connected
        if (address) {
          await checkVoteStatus(pollData.id);
        } else {
          setCurrentVoteResult({ hasVoted: false, optionId: 0 });
        }
      }
    } catch (error) {
      console.error("Error loading poll:", error);
      if (isMounted.current) {
        setPollError(true);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [address, checkVoteStatus]);
  
  // Load poll data on initial mount
  useEffect(() => {
    loadPollData();
  }, [loadPollData]);
  
  // Refresh vote status when wallet address changes
  useEffect(() => {
    if (pollData && pollData.id) {
      checkVoteStatus(pollData.id);
    }
  }, [address, pollData, checkVoteStatus]);

  // Handle successful vote
  const handleVoteSuccess = async (optionId?: number) => {
    if (!pollData || !address) return;
    
    try {
      // Optimistically update UI if option ID was provided
      if (optionId && !currentVoteResult.hasVoted) {
        // Create a new vote counts array with optionId incremented by 1
        const updatedVoteCounts = [...pollData.voteCounts];
        updatedVoteCounts[optionId - 1] = Number(updatedVoteCounts[optionId - 1] || 0) + 1;
        
        // Update poll data with optimistic changes
        setPollData({
          ...pollData,
          voteCounts: updatedVoteCounts
        });
        
        // Update vote result
        setCurrentVoteResult({
          hasVoted: true,
          optionId: optionId
        });
        
        // We rely purely on the optimistic update for immediate UI feedback
        // and don't do any blockchain queries until later
      }
      
      // Schedule a background update after a significant delay to avoid race conditions
      // This ensures the transaction has time to be processed
      const updateTimeout = setTimeout(async () => {
        try {
          const updatedPoll = await pollContract.getPoll(pollData.id, true);
          if (updatedPoll && updatedPoll.voteCounts && isMounted.current) {
            setPollData(prevPollData => ({
              ...prevPollData!,
              voteCounts: updatedPoll.voteCounts
            }));
          }
        } catch (error) {
          console.error("Error in delayed poll update:", error);
        }
      }, 5000); // 5 second delay
      
      // Clean up timeout if component unmounts
      return () => clearTimeout(updateTimeout);
    } catch (error) {
      console.error("Error refreshing data after vote:", error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-base-light dark:bg-base-dark">
      <header className="sticky top-0 backdrop-blur-md bg-white/70 dark:bg-base-dark/70 border-b border-gray-200 dark:border-gray-800 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-base-blue">
            <span className="text-base-purple">Based</span>Poll
          </h1>
          <WalletConnect />
        </div>
      </header>

      <section className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          {isLoading ? (
            <div className="bg-white dark:bg-base-dark rounded-xl p-5 md:p-6 shadow-md">
              <div className="flex flex-col items-center justify-center py-4">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-2"></div>
                <p className="text-center">Loading poll data...</p>
              </div>
            </div>
          ) : pollError ? (
            <div className="bg-white dark:bg-base-dark rounded-xl p-5 md:p-6 shadow-md">
              <p className="text-center text-red-500">Error loading poll data</p>
            </div>
          ) : !pollData ? (
            <div className="bg-white dark:bg-base-dark rounded-xl p-5 md:p-6 shadow-md">
              <p className="text-center">No poll data available</p>
            </div>
          ) : (
            <PollCard 
              poll={pollData} 
              voteResult={currentVoteResult} 
              onVoteSuccess={handleVoteSuccess}
              prePollId={pollData.prePollId}
            />
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
