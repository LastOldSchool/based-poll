"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import WalletConnect from "../components/WalletConnect";
import CreatePollForm from "../components/poll/CreatePollForm";
import PollCard from "../components/poll/PollCard";
import ImportPollForm from "../components/poll/ImportPollForm";
import Footer from "../components/Footer";
import { getCreatedPolls, StoredPoll } from '@/utils/localStorage';
import { formatDate, isPollEnded } from '@/utils/poll-utils';
import { Button } from '@/components/ui/button';
import { loadPollDetails } from "../utils/poll-fetcher";
import { Poll } from "../utils/types";
import { useAccount } from "wagmi";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"vote" | "create" | "import">("vote");
  const [userPolls, setUserPolls] = useState<StoredPoll[]>([]);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPolls, setIsLoadingPolls] = useState(true);
  const [pollData, setPollData] = useState<Poll | null>(null);
  const [currentVoteResult, setCurrentVoteResult] = useState<{ hasVoted: boolean; optionId: number }>({ 
    hasVoted: false, 
    optionId: 0 
  });
  const [pollError, setPollError] = useState(false);
  const [pollsLoaded, setPollsLoaded] = useState(false);
  const isMounted = useRef(true);
  const { address } = useAccount();
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Create a memoized function to fetch polls from localStorage
  const loadUserPolls = useCallback(() => {
    setIsLoadingPolls(true);
    const storedPolls = getCreatedPolls();
    if (storedPolls.length > 0) {
      // Sort by creation date descending (newest first)
      const sortedPolls = storedPolls.sort((a, b) => b.createdAt - a.createdAt);
      setUserPolls(sortedPolls);
    } else {
      setUserPolls([]);
    }
    setPollsLoaded(true);
    setIsLoadingPolls(false);
  }, []);

  // Load user polls from localStorage on component mount
  useEffect(() => {
    loadUserPolls();
  }, [loadUserPolls]);

  // Reload polls when activeTab changes to "vote"
  useEffect(() => {
    if (activeTab === "vote") {
      loadUserPolls();
      // Clear selected poll when switching to vote tab
      setSelectedPollId(null);
    }
  }, [activeTab, loadUserPolls]);

  // Switch to Create Poll tab only after polls are confirmed to be loaded and empty
  useEffect(() => {
    if (activeTab === "vote" && pollsLoaded && userPolls.length === 0) {
      setActiveTab("create");
    }
  }, [activeTab, userPolls.length, pollsLoaded]);

  // Load a specific poll - simplified with clean approach
  const handleLoadPoll = useCallback(async (pollId: string) => {
    setSelectedPollId(pollId);
    setIsLoading(true);
    setPollError(false);
    
    try {
      // Always force a fresh fetch from the blockchain
      const result = await loadPollDetails(
        pollId as `0x${string}`, 
        address as `0x${string}` || undefined
      );
      
      if (isMounted.current) {
        setPollData(result.pollData);
        setCurrentVoteResult(result.voteResult);
        setPollError(!result.pollData);
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
  }, [address]);

  // Clear the selected poll
  const handleBackToList = () => {
    setSelectedPollId(null);
    setPollData(null);
    setCurrentVoteResult({ hasVoted: false, optionId: 0 });
  };

  // Handle successful vote with data refetch
  const handleVoteSuccess = useCallback(async () => {
    if (selectedPollId) {
      setIsLoading(true);
      try {
        const result = await loadPollDetails(
          selectedPollId as `0x${string}`, 
          address as `0x${string}` || undefined
        );
        
        if (isMounted.current) {
          setPollData(result.pollData);
          setCurrentVoteResult(result.voteResult);
        }
      } catch (error) {
        console.error("Error refreshing poll data after vote:", error);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    }
  }, [selectedPollId, address]);

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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Your Polls</h2>
              <Button 
                onClick={() => setActiveTab("import")}
                variant="outline"
                className="flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Import Poll
              </Button>
            </div>
            
            {selectedPollId ? (
              // Show selected poll details
              <div className="space-y-4">
                <button 
                  onClick={handleBackToList}
                  className="flex items-center text-base-blue hover:underline mb-4"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Back to polls
                </button>
                
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
                  />
                )}
              </div>
            ) : isLoadingPolls ? (
              // Loading state
              <div className="bg-white dark:bg-base-dark rounded-xl p-8 shadow-md">
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-2"></div>
                  <p className="text-center text-gray-500">Loading polls...</p>
                </div>
              </div>
            ) : pollsLoaded && userPolls.length === 0 ? (
              // Empty state - only shown when polls are confirmed to be loaded and empty
              <div className="bg-white dark:bg-base-dark rounded-xl p-8 shadow-md text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-lg mb-4">No polls found</p>
                <div className="flex justify-center">
                  <Button 
                    onClick={() => setActiveTab("create")}
                    variant="primary"
                    className="bg-base-purple hover:bg-purple-700 shadow-md transition-all duration-200 hover:shadow-lg"
                  >
                    Create Your First Poll
                  </Button>
                </div>
              </div>
            ) : (
              // Show list of polls
              <div className="grid gap-4">
                {userPolls.map((poll) => {
                  const ended = isPollEnded(poll.deadline);
                  const formattedDate = formatDate(poll.deadline);
                  
                  return (
                    <div 
                      key={poll.id} 
                      className="bg-white dark:bg-base-dark rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <h3 className="font-medium text-lg mb-3">{poll.question}</h3>
                      <div className="flex flex-wrap justify-between text-sm mb-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          ended 
                            ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300" 
                            : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                        }`}>
                          {ended ? "Ended" : "Active"}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {ended ? "Ended on" : "Ends on"}: {formattedDate}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleLoadPoll(poll.id)}
                        variant="outline"
                        fullWidth
                        className="hover:bg-blue-50 dark:hover:bg-blue-950/20 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        View Results
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === "create" ? (
          <CreatePollForm />
        ) : (
          <ImportPollForm onSuccess={() => {
            loadUserPolls();
            setActiveTab("vote");
          }} />
        )}
      </section>

      <Footer />
    </main>
  );
}
