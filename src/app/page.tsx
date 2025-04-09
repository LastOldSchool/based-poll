"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import WalletConnect from "../components/WalletConnect";
import CreatePollForm from "../components/poll/CreatePollForm";
import PollCard from "../components/poll/PollCard";
import ImportPollForm from "../components/poll/ImportPollForm";
import Footer from "../components/Footer";
import { usePoll } from "../hooks/usePoll";
import { getCreatedPolls, StoredPoll } from "../utils/localStorage";
import { formatDate, isPollEnded } from "../utils/poll-utils";
import { Button } from "../components/ui/button";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"vote" | "create" | "import">("vote");
  const { pollData, isPollLoading, isPollError, fetchPoll, getVoteResult } = usePoll();
  const [userPolls, setUserPolls] = useState<StoredPoll[]>([]);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [currentVoteResult, setCurrentVoteResult] = useState<{ hasVoted: boolean; optionId: number }>({ 
    hasVoted: false, 
    optionId: 0 
  });
  const isMounted = useRef(true);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Create a memoized function to fetch polls from localStorage
  const loadUserPolls = useCallback(() => {
    const storedPolls = getCreatedPolls();
    if (storedPolls.length > 0) {
      // Sort by creation date descending (newest first)
      const sortedPolls = storedPolls.sort((a, b) => b.createdAt - a.createdAt);
      setUserPolls(sortedPolls);
    }
  }, []);

  // Load user polls from localStorage on component mount
  useEffect(() => {
    loadUserPolls();
  }, [loadUserPolls]);

  // Fetch vote result when poll data changes
  useEffect(() => {
    if (pollData) {
      const fetchVoteResult = async () => {
        try {
          const result = await getVoteResult();
          if (isMounted.current) {
            setCurrentVoteResult(result);
          }
        } catch (error) {
          console.error("Error fetching vote result:", error);
          if (isMounted.current) {
            setCurrentVoteResult({ hasVoted: false, optionId: 0 });
          }
        }
      };
      
      fetchVoteResult();
    }
  }, [pollData, getVoteResult]);

  // Reload polls when activeTab changes to "vote"
  useEffect(() => {
    if (activeTab === "vote") {
      loadUserPolls();
      // Clear selected poll when switching to vote tab
      setSelectedPollId(null);
    }
  }, [activeTab, loadUserPolls]);

  // Handle loading a specific poll
  const handleLoadPoll = (pollId: string) => {
    setSelectedPollId(pollId);
    setLocalLoading(true);
    fetchPoll(pollId as `0x${string}`);
    
    // Force a vote result refresh after a short delay to ensure the poll data is loaded
    setTimeout(() => {
      if (getVoteResult) {
        getVoteResult(true).then(result => {
          setCurrentVoteResult(result);
        });
      }
    }, 300);
  };

  // When poll data or loading status changes, update local loading state
  useEffect(() => {
    if (!isPollLoading && selectedPollId) {
      // Allow a small delay for the UI to update
      const timer = setTimeout(() => {
        setLocalLoading(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isPollLoading, selectedPollId, pollData]);

  // Clear the selected poll
  const handleBackToList = () => {
    setSelectedPollId(null);
  };

  // Determine if we're in a loading state
  const isLoading = isPollLoading || localLoading;

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
              <button
                onClick={() => setActiveTab("import")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "import"
                    ? "bg-green-100 dark:bg-green-950/30 text-green-700"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                Import
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
            {userPolls.length === 0 ? (
              <div className="bg-white dark:bg-base-dark border border-gray-200 dark:border-gray-800 rounded-xl p-5 md:p-6 shadow-sm">
                <p className="text-center">No polls found. Create a poll to get started!</p>
              </div>
            ) : selectedPollId ? (
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
                  <div className="bg-white dark:bg-base-dark border border-gray-200 dark:border-gray-800 rounded-xl p-5 md:p-6 shadow-sm">
                    <div className="flex flex-col items-center justify-center py-4">
                      <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-2"></div>
                      <p className="text-center">Loading poll data...</p>
                    </div>
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
                  <PollCard poll={pollData} voteResult={currentVoteResult} />
                )}
              </div>
            ) : (
              // Show list of polls
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Your Polls</h2>
                
                {userPolls.map((poll) => {
                  const ended = isPollEnded(poll.deadline);
                  const formattedDate = formatDate(poll.deadline);
                  
                  return (
                    <div 
                      key={poll.id} 
                      className="bg-white dark:bg-base-dark border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-medium text-lg mb-2">{poll.question}</h3>
                      <div className="flex flex-wrap justify-between text-sm mb-3">
                        <span className="text-gray-500 dark:text-gray-400">
                          {ended ? "Ended on" : "Ends on"}: {formattedDate}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {poll.options.length} options
                        </span>
                      </div>
                      <Button
                        onClick={() => handleLoadPoll(poll.id)}
                        variant="outline"
                        fullWidth
                      >
                        Load Poll Details
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === "create" ? (
          <div className="max-w-lg mx-auto">
            <CreatePollForm />
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <ImportPollForm 
              onSuccess={() => {
                // Reload polls and switch to vote tab
                loadUserPolls();
                setActiveTab("vote");
              }}
            />
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
