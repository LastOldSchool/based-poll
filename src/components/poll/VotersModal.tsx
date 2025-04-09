"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getUserVotesForOption } from "@/utils/localStorage";
import { getOnChainVotersForOption } from "@/utils/contract";
import { X, ExternalLink, Copy, RefreshCw, Info, AlertTriangle, Loader2 } from "lucide-react";

interface VotersModalProps {
  pollId: string;
  optionId: number;
  optionText: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal component that displays a list of voters (ethereum addresses) for a specific poll option
 * @param pollId - The ID of the poll
 * @param optionId - The ID of the option to show voters for
 * @param optionText - The text of the selected option
 * @param isOpen - Whether the modal is open
 * @param onClose - Function to call when the modal is closed
 */
export default function VotersModal({ 
  pollId, 
  optionId, 
  optionText,
  isOpen, 
  onClose 
}: VotersModalProps) {
  const [voters, setVoters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSource, setLoadingSource] = useState<'local' | 'blockchain'>('local');
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chainFailed, setChainFailed] = useState(false);
  const [showingLocalOnly, setShowingLocalOnly] = useState(false);
  const [attemptedBlockchainFetch, setAttemptedBlockchainFetch] = useState(false);

  // Function to fetch voters from both blockchain and local storage
  const fetchVoters = useCallback(async () => {
    setLoading(true);
    setError(null);
    setChainFailed(false);
    setShowingLocalOnly(false);
    setAttemptedBlockchainFetch(false);
    
    try {
      // First check if the pollId is valid
      if (!pollId) {
        setError("Invalid poll ID");
        setLoading(false);
        return;
      }
      
      // First get local voters (fast)
      setLoadingSource('local');
      const localVoters = getUserVotesForOption(pollId, optionId);
      
      // Set initial voters from local storage
      setVoters(localVoters);
      
      // If we have local voters, show them immediately while we wait for blockchain data
      if (localVoters.length > 0) {
        setShowingLocalOnly(true);
        setLoading(false);
      }
      
      // Then try to get blockchain voters (might take longer)
      if (pollId && pollId.startsWith('0x')) {
        setLoadingSource('blockchain');
        setAttemptedBlockchainFetch(true);
        
        try {
          // Set a timeout to fail gracefully if blockchain data takes too long
          const timeoutPromise = new Promise<string[]>((_, reject) => {
            setTimeout(() => reject(new Error("Blockchain request timed out")), 10000);
          });
          
          // Race between the actual data fetch and the timeout
          const chainVoters = await Promise.race([
            getOnChainVotersForOption(pollId as `0x${string}`, optionId),
            timeoutPromise
          ]);
          
          // Combine and remove duplicates (case-insensitive)
          const addressMap = new Map<string, string>();
          
          // First add chain voters (they take precedence)
          chainVoters.forEach(address => {
            addressMap.set(address.toLowerCase(), address);
          });
          
          // Then add local voters if they're not already in the map
          localVoters.forEach(address => {
            const lowerAddress = address.toLowerCase();
            if (!addressMap.has(lowerAddress)) {
              addressMap.set(lowerAddress, address);
            }
          });
          
          // Convert back to array
          const combinedVoters = Array.from(addressMap.values());
          setVoters(combinedVoters);
          setShowingLocalOnly(false);
        } catch (error) {
          console.error("Error fetching blockchain voters:", error);
          setChainFailed(true);
          
          // Keep showing local voters if we have them
          if (localVoters.length === 0) {
            setError("Failed to fetch blockchain data. Only showing local votes.");
          }
        }
      } else if (pollId && !pollId.startsWith('0x')) {
        // This is a local-only poll without a valid blockchain ID
        setShowingLocalOnly(true);
      }
    } catch (error) {
      console.error("Error fetching voters:", error);
      setError("Failed to fetch voter data. Please try again.");
      setVoters([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [pollId, optionId]);

  // Get the list of voters when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetchVoters();
    }
  }, [isOpen, fetchVoters]);

  // Handle manual refresh
  const handleRefresh = () => {
    if (!isRefreshing) {
      setIsRefreshing(true);
      fetchVoters();
    }
  };

  // Handle copy address to clipboard
  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    
    // Clear the copied state after 2 seconds
    setTimeout(() => {
      setCopiedAddress(null);
    }, 2000);
  };

  // Format Ethereum address for display (0x1234...5678)
  const formatAddress = (address: string) => {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Handle view on explorer
  const viewOnExplorer = (address: string) => {
    window.open(`https://basescan.org/address/${address}`, '_blank');
  };

  if (!isOpen) return null;

  // Determine loading message based on current loading state
  const getLoadingMessage = () => {
    if (loadingSource === 'local') return "Loading local votes...";
    return "Loading blockchain votes...";
  };

  // Get the appropriate message when no voters are found
  const getNoVotersMessage = () => {
    if (error) return error;
    if (chainFailed && !attemptedBlockchainFetch) return "Could not access blockchain data.";
    if (pollId && !pollId.startsWith('0x')) return "This poll exists only locally. No blockchain data available.";
    return "No voters found for this option";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div 
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Voters for &quot;{optionText}&quot;
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className={`p-1.5 rounded-full transition-colors ${isRefreshing || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              aria-label="Refresh voters"
              title="Refresh voters"
            >
              <RefreshCw 
                size={16} 
                className={`text-gray-600 dark:text-gray-300 ${isRefreshing ? 'animate-spin' : ''}`} 
              />
            </button>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-4">
          {loading && !showingLocalOnly ? (
            <div className="flex flex-col items-center py-8 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {getLoadingMessage()}
              </div>
            </div>
          ) : (
            <>
              {showingLocalOnly && attemptedBlockchainFetch && (
                <div className="mb-4 flex items-center p-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700/30 rounded-md">
                  <Loader2 size={16} className="text-blue-500 animate-spin mr-2 flex-shrink-0" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Showing votes from local storage while fetching blockchain data...
                  </p>
                </div>
              )}
              
              {chainFailed && attemptedBlockchainFetch && (
                <div className="mb-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-md flex items-start">
                  <AlertTriangle size={16} className="text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Could not load data from blockchain. {voters.length > 0 ? "Showing available votes from local storage only." : "Try refreshing or checking your network connection."}
                  </p>
                </div>
              )}
              
              {pollId && !pollId.startsWith('0x') && (
                <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700/30 rounded-md flex items-start">
                  <Info size={16} className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    This poll exists only in your browser&apos;s local storage. Vote data is not available from the blockchain.
                  </p>
                </div>
              )}
              
              {error && !voters.length && (
                <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-md flex items-start">
                  <AlertTriangle size={16} className="text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}
              
              {voters.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 flex flex-col items-center space-y-2">
                  <Info size={24} className="text-gray-400" />
                  <p>{getNoVotersMessage()}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {voters.map((address, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">
                        {formatAddress(address)}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleCopy(address)}
                          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          aria-label="Copy address"
                          title="Copy address"
                        >
                          {copiedAddress === address ? (
                            <span className="text-xs text-green-600 dark:text-green-400">Copied!</span>
                          ) : (
                            <Copy size={16} className="text-gray-600 dark:text-gray-300" />
                          )}
                        </button>
                        <button
                          onClick={() => viewOnExplorer(address)}
                          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          aria-label="View on explorer"
                          title="View on explorer"
                        >
                          <ExternalLink size={16} className="text-gray-600 dark:text-gray-300" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 