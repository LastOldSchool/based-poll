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
          onClick={handleConnect}
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-base-blue text-white font-medium hover:bg-opacity-90 transition-all disabled:opacity-70"
        >
          {isPending ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
    </div>
  );
} 