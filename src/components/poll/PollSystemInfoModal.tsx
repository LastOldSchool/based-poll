"use client";

import React from "react";
import { Modal } from "../ui/modal";
import { Poll } from "@/utils/types";
import { pollContract } from '@/utils/contract';
import { useAccount } from "wagmi";
import { calculatePollId } from '@/utils/poll-utils';

/**
 * PollSystemInfoModal component props
 */
interface PollSystemInfoModalProps {
  /** Poll data to display */
  poll: Poll;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Pre-poll ID if available */
  prePollId?: string;
}

/**
 * Component for displaying system info about a poll in a modal
 */
export function PollSystemInfoModal({ poll, isOpen, onClose, prePollId }: PollSystemInfoModalProps) {
  const { address } = useAccount();
  const [isPollCreated, setIsPollCreated] = React.useState<boolean | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [contractPollId, setContractPollId] = React.useState<string | null>(null);
  
  // Check if the poll exists on the blockchain and calculate the ID according to contract
  React.useEffect(() => {
    if (!isOpen) return;
    
    const checkPollInfo = async () => {
      setIsLoading(true);
      try {
        // Calculate the poll ID using the contract's method
        if (prePollId) {
          const params = {
            prePollId: prePollId as `0x${string}`,
            optionCount: poll.optionCount,
            deadline: poll.deadline
          };
          
          const calculatedId = calculatePollId(params);
          setContractPollId(calculatedId);
          
          // Check if poll exists on blockchain using the calculated ID
          const pollData = await pollContract.getPoll(calculatedId, true);
          setIsPollCreated(Boolean(pollData?.exists));
        } else {
          // If we don't have the prePollId, we can only check with the existing ID
          const pollData = await pollContract.getPoll(poll.id as `0x${string}`, true);
          setIsPollCreated(Boolean(pollData?.exists));
        }
      } catch (error) {
        console.error("Error checking poll info:", error);
        setIsPollCreated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkPollInfo();
  }, [poll.id, isOpen, prePollId, poll.optionCount, poll.deadline]);

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .catch(error => console.error("Failed to copy text:", error));
  };
  
  return (
    <Modal title="Poll System Information" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
          <div className="flex justify-between items-start">
            <h4 className="font-semibold mb-2">Poll ID</h4>
            <button 
              onClick={() => copyToClipboard(isPollCreated && contractPollId ? contractPollId : poll.id)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
              title="Copy ID"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
          <p className="break-all font-mono text-xs">{isPollCreated && contractPollId ? contractPollId : poll.id}</p>
        </div>
        
        {prePollId && (
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
            <div className="flex justify-between items-start">
              <h4 className="font-semibold mb-2">Pre-Poll ID</h4>
              <button 
                onClick={() => copyToClipboard(prePollId)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                title="Copy Pre-Poll ID"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
            <p className="break-all font-mono text-xs">{prePollId}</p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
            <h4 className="font-semibold mb-2">Option Count</h4>
            <p>{poll.optionCount}</p>
          </div>
          
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
            <h4 className="font-semibold mb-2">Deadline</h4>
            <p>{new Date(poll.deadline * 1000).toLocaleString()}</p>
          </div>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
          <h4 className="font-semibold mb-2">On-Chain Status</h4>
          {isLoading ? (
            <p className="text-sm">Checking blockchain status...</p>
          ) : isPollCreated ? (
            <div>
              <p className="text-green-600 dark:text-green-400">Poll exists on blockchain</p>
            </div>
          ) : (
            <div>
              <p className="text-red-600 dark:text-red-400">Poll does not exist on blockchain</p>
            </div>
          )}
        </div>
        
        {address && (
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
            <h4 className="font-semibold mb-2">Connected Wallet</h4>
            <p className="font-mono text-xs">{address}</p>
          </div>
        )}
        
        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
          <h4 className="font-semibold mb-2">Total Votes</h4>
          <p>{poll.voteCounts.reduce((sum, count) => sum + count, 0)}</p>
        </div>
      </div>
    </Modal>
  );
}

export default PollSystemInfoModal; 