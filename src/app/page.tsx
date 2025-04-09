"use client";

import { useState, useEffect, useCallback } from "react";
import WalletConnect from "../components/WalletConnect";
import CreatePollForm from "../components/poll/CreatePollForm";
import PollCard from "../components/poll/PollCard";
import Footer from "../components/Footer";
import { usePoll } from "../hooks/usePoll";
import { useAccount } from "wagmi";
import { pollContract } from "../utils/contract";
import { generatePrePollId, calculatePollId } from "../utils/poll-utils";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"vote" | "create">("vote");
  const { pollData, isPollLoading, isPollError, setIsPollError, fetchPoll } = usePoll();
  const { address } = useAccount();
  const [voteResult, setVoteResult] = useState({ hasVoted: false, optionId: 0 });
  const [isLoadingPoll, setIsLoadingPoll] = useState(false);

  // Create a memoized function to fetch poll data to prevent recreating it on every render
  const fetchPollData = useCallback(async () => {
    if (isLoadingPoll) return; // Prevent concurrent requests
    
    setIsLoadingPoll(true);
    try {
      // Sample poll parameters - in a real app, these would come from an API or storage
      const pollQuestion = "What is your favorite Base chain DApp?";
      const options = [
        "Decentralized Exchange",
        "NFT Marketplace",
        "DeFi Protocol",
        "Social Media",
        "Gaming",
      ];
      const deadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days from now
      
      // Generate prePollId from question
      const prePollId = generatePrePollId(pollQuestion) as `0x${string}`;
      const optionCount = options.length;
      
      // Try to calculate actual poll ID
      try {
        const actualPollId = await pollContract.calculateActualPollId(
          prePollId,
          optionCount,
          deadline
        );
        
        // Fetch the poll using the calculated ID
        fetchPoll(actualPollId);
      } catch (error) {
        console.error("Failed to calculate poll ID dynamically:", error);
        console.log("Using fallback approach with client-side calculation");
        
        // Use client-side calculation as fallback
        const clientSideId = calculatePollId({ 
          prePollId, 
          optionCount, 
          deadline 
        });
        
        fetchPoll(clientSideId);
      }
    } catch (error) {
      console.error("Failed to fetch poll data:", error);
      setIsPollError(true);
    } finally {
      setIsLoadingPoll(false);
    }
  }, [fetchPoll, setIsPollError, isLoadingPoll]);

  // Fetch a poll on component mount (in a real app, this would use a router parameter)
  useEffect(() => {
    fetchPollData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Check if the user has voted when address or poll ID changes
  // Add debounce to prevent too many calls
  useEffect(() => {
    if (!address || !pollData?.id) return;
    
    let isCancelled = false;
    
    const checkVote = async () => {
      try {
        // Check if effect is still valid
        if (isCancelled) return;
        
        // Call contract to check if user has voted
        const result = await pollContract.checkVote(pollData.id, address);
        
        // Check if effect is still valid before updating state
        if (!isCancelled) {
          setVoteResult(result);
        }
      } catch (error) {
        console.error("Error checking vote:", error);
      }
    };
    
    // Delay the execution to prevent too many calls
    const timeoutId = setTimeout(checkVote, 500);
    
    // Cleanup function to handle component unmount or dependencies change
    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [address, pollData?.id]);

  return (
    <main className="flex min-h-screen flex-col bg-base-light dark:bg-base-dark">
      <header className="sticky top-0 backdrop-blur-md bg-white/70 dark:bg-base-dark/70 border-b border-gray-200 dark:border-gray-800 z-10">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between mb-4 md:mb-0">
            <h1 className="text-2xl font-bold text-base-blue">
              <span className="text-base-purple">Based</span>Poll
            </h1>
            <div className="md:hidden">
              <WalletConnect />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex space-x-2 md:mr-6">
              <button
                onClick={() => setActiveTab("vote")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "vote"
                    ? "bg-blue-100 dark:bg-blue-950/30 text-base-blue"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                Vote
              </button>
              <button
                onClick={() => setActiveTab("create")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "create"
                    ? "bg-purple-100 dark:bg-purple-950/30 text-base-purple"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                Create Poll
              </button>
            </div>
            
            <div className="hidden md:block">
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-8">
        {activeTab === "vote" ? (
          <div className="max-w-lg mx-auto">
            {isPollLoading ? (
              <div className="bg-white dark:bg-base-dark border border-gray-200 dark:border-gray-800 rounded-xl p-5 md:p-6 shadow-sm">
                <p className="text-center">Loading poll data...</p>
              </div>
            ) : isPollError ? (
              <div className="bg-white dark:bg-base-dark border border-gray-200 dark:border-gray-800 rounded-xl p-5 md:p-6 shadow-sm">
                <p className="text-center text-red-500">Error loading poll data</p>
              </div>
            ) : !pollData ? (
              <div className="bg-white dark:bg-base-dark border border-gray-200 dark:border-gray-800 rounded-xl p-5 md:p-6 shadow-sm">
                <p className="text-center">No poll data available</p>
              </div>
            ) : (
              <PollCard poll={pollData} voteResult={voteResult} />
            )}
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <CreatePollForm />
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
