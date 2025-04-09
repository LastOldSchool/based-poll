"use client";

import { useState, useEffect } from "react";
import { formatAddress } from "../utils/reown";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";

/**
 * Wallet connection component using Reown AppKit
 */
export default function ReownConnect() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle client-side only rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async () => {
    if (typeof window === 'undefined') return;
    
    setIsPending(true);
    try {
      await open();
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setIsPending(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await open({ view: 'Account' });
    } catch (error) {
      console.error("Error opening account view:", error);
    }
  };

  // Render a placeholder during server-side rendering
  if (!mounted) {
    return (
      <div className="relative">
        <button
          className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium text-lg shadow-md hover:bg-blue-700 transition-all border-2 border-blue-700"
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
          className="flex items-center px-6 py-3 rounded-lg bg-purple-600 text-white font-medium text-lg shadow-md hover:bg-purple-700 transition-all border-2 border-purple-700"
        >
          <span className="hidden md:inline-block mr-2">Connected:</span>
          <span>{address ? formatAddress(address) : "..."}</span>
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isPending}
          className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium text-lg shadow-md hover:bg-blue-700 transition-all disabled:opacity-70 border-2 border-blue-700"
        >
          {isPending ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
    </div>
  );
} 