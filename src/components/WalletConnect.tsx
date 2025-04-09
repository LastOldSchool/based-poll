"use client";

import { useState, useEffect } from "react";
import { formatAddress } from "../utils/reown";

/**
 * Mock wallet connection component
 */
export default function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle client-side only rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async () => {
    setError(null);
    setIsPending(true);
    
    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockAddress = "0x" + Array.from({length: 40}, () => 
        Math.floor(Math.random() * 16).toString(16)).join('');
      
      setAddress(mockAddress);
      setIsConnected(true);
      setIsModalOpen(false);
    } catch (error: unknown) {
      console.error("Error connecting wallet:", error);
      setError("Failed to connect wallet");
    } finally {
      setIsPending(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setAddress(null);
      setIsConnected(false);
    } catch (error: unknown) {
      console.error("Error disconnecting wallet:", error);
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
          className="flex items-center px-4 py-2 rounded-lg bg-base-purple text-white font-medium hover:bg-opacity-90 transition-all"
        >
          <span className="hidden md:inline-block mr-2">Connected:</span>
          <span>{address ? formatAddress(address) : "..."}</span>
        </button>
      ) : (
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-base-blue text-white font-medium hover:bg-opacity-90 transition-all disabled:opacity-70"
        >
          {isPending ? "Connecting..." : "Connect Wallet"}
        </button>
      )}

      {isModalOpen && (
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
                <span>MetaMask / Browser Wallet</span>
              </button>
              <button
                onClick={handleConnect}
                disabled={isPending}
                className="flex items-center justify-center space-x-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-70"
              >
                <span>WalletConnect</span>
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