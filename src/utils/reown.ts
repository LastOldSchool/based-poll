"use client";

/**
 * Format full address to a shortened display version
 * @param address - Full blockchain address
 * @returns Shortened address string
 */
export const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
}; 