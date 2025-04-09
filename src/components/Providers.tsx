"use client";

import { ReactNode } from "react";
import { base } from "viem/chains";
import { http } from "viem";
import { WagmiProvider, createConfig } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected } from "wagmi/connectors";

// Create a React Query client
const queryClient = new QueryClient();

/**
 * Configure wagmi client
 */
const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http()
  },
  connectors: [
    injected()
  ]
});

/**
 * Client-side provider wrapper for the application
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
} 