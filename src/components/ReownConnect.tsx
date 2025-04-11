"use client";

import { useState, useEffect } from "react";
import { formatAddress } from '@/utils/reown';
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Button } from "./ui/Button";

interface ReownConnectProps {
  fullWidth?: boolean;
}

/**
 * Wallet connection component using Reown AppKit
 * @param fullWidth - Whether the button should take full width
 */
export default function ReownConnect({ fullWidth = false }: ReownConnectProps) {
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
        <Button
          variant="primary"
          size="lg"
          fullWidth={fullWidth}
        >
          Connect Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`}>
      {isConnected ? (
        <Button
          onClick={handleDisconnect}
          variant="secondary"
          size="lg"
          fullWidth={fullWidth}
        >
          <span className="hidden md:inline-block mr-2">Connected:</span>
          <span>{address ? formatAddress(address) : "..."}</span>
        </Button>
      ) : (
        <Button
          onClick={handleConnect}
          disabled={isPending}
          isLoading={isPending}
          variant="primary"
          size="lg"
          fullWidth={fullWidth}
        >
          Connect Wallet
        </Button>
      )}
    </div>
  );
} 