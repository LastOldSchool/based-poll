"use client";

import { useState, useEffect } from "react";
import { formatAddress } from "../utils/reown";
import { useAccount } from "wagmi";

/**
 * Wallet connection component using Wagmi
 */
export default function WalletConnect() {
  const { address, isConnected } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Handle client-side only rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    
    // Add event listener for the custom connect-wallet event
    const handleConnectWalletEvent = () => {
      handleConnect();
    };
    
    window.addEventListener('connect-wallet', handleConnectWalletEvent);
    
    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('connect-wallet', handleConnectWalletEvent);
    };
  }, []);

  const handleConnect = async () => {
    if (typeof window === 'undefined') return;
    
    setError(null);
    setIsPending(true);
    
    try {
      // Use window.ethereum directly since we're using wagmi
      if (window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } else {
        setError("No wallet detected");
      }
      setIsModalOpen(false);
    } catch (error: unknown) {
      // More specific error handling
      if (error instanceof Error) {
        setError(`Failed to connect wallet: ${error.message}`);
      } else if (typeof error === 'object' && error !== null) {
        // Some wallet providers return custom error objects
        const errorObj = error as Record<string, unknown>;
        const errorMessage = errorObj.message || JSON.stringify(error);
        setError(`Failed to connect wallet: ${errorMessage}`);
      } else {
        // Fallback for any other error type
        setError("Failed to connect wallet. Please try again.");
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleDisconnect = async () => {
    // Since wagmi's useAccount is read-only,
    // we would typically rely on wallet's disconnection
    // but for this demo, we'll just reload the page
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // Render a placeholder during server-side rendering
  if (!mounted) {
    return (
      <div className="relative">
        <button
          className="px-4 py-2 rounded-lg bg-base-blue text-white font-medium hover:bg-opacity-90 transition-all"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {isConnected ? (
        <button
          onClick={handleDisconnect}
          className="flex items-center px-4 py-2 rounded-lg bg-base-purple text-black font-medium hover:bg-opacity-90 transition-all"
        >
          <span className="hidden md:inline-block mr-2">Connected:</span>
          <span>{address ? formatAddress(address) : "..."}</span>
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-base-blue text-white font-medium hover:bg-opacity-90 transition-all disabled:opacity-70"
        >
          {isPending ? "Connecting..." : "Connect Wallet"}
        </button>
      )}

      {isModalOpen && !isConnected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-base-dark rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Connect Wallet</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleConnect}
                disabled={isPending}
                className="flex items-center justify-center space-x-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-70"
              >
                <span>Connect Wallet</span>
              </button>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 