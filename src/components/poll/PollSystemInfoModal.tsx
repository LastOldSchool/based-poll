"use client";

import React from "react";
import { Modal } from "../ui/modal";
import { Poll } from "@/utils/types";
import { getCreatedPollById } from "../../utils/localStorage";
import { pollContract } from "../../utils/contract";
import { useAccount } from "wagmi";
import { calculatePollId } from "../../utils/poll-utils";

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
}

/**
 * Component for displaying system info about a poll in a modal
 */
export function PollSystemInfoModal({ poll, isOpen, onClose }: PollSystemInfoModalProps) {
  const { address } = useAccount();
  const [isPollCreated, setIsPollCreated] = React.useState<boolean | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [contractPollId, setContractPollId] = React.useState<string | null>(null);
  const [idMatch, setIdMatch] = React.useState<boolean>(false);

  // Get the full stored poll data including prePollId
  const storedPoll = getCreatedPollById(poll.id);
  
  // Check if the poll exists on the blockchain and calculate the ID according to contract
  React.useEffect(() => {
    if (!isOpen || !storedPoll) return;
    
    const checkPollInfo = async () => {
      setIsLoading(true);
      try {
        // Calculate the poll ID using the contract's method
        if (storedPoll.prePollId) {
          const params = {
            prePollId: storedPoll.prePollId as `0x${string}`,
            optionCount: storedPoll.optionCount,
            deadline: storedPoll.deadline
          };
          
          const calculatedId = calculatePollId(params);
          setContractPollId(calculatedId);
          setIdMatch(calculatedId === poll.id);
          
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
  }, [poll.id, isOpen, storedPoll]);
  
  return (
    <Modal title="Poll System Information" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
          <h4 className="font-semibold mb-2">Stored Poll ID</h4>
          <p className="break-all font-mono text-xs">{poll.id}</p>
          
          {contractPollId && contractPollId !== poll.id && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-red-500 dark:text-red-400 text-xs mb-1">
                ID mismatch detected! The contract would use:
              </p>
              <p className="break-all font-mono text-xs">{contractPollId}</p>
            </div>
          )}
        </div>
        
        {storedPoll?.prePollId && (
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
            <h4 className="font-semibold mb-2">Pre-Poll ID</h4>
            <p className="break-all font-mono text-xs">{storedPoll.prePollId}</p>
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
              {!idMatch && (
                <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                  Note: The poll exists but under a different ID
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-red-600 dark:text-red-400">Poll does not exist on blockchain</p>
              {contractPollId && (
                <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                  Check may be using incorrect ID. Try checking the contract with ID shown above.
                </p>
              )}
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