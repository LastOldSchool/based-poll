"use client";

import { useRef, useCallback } from "react";

/**
 * Hook for managing poll contract requests with caching and retry functionality
 * @returns Functions for making deduplicated chain requests
 */
export function usePollRequestManager() {
  const requestsInProgressRef = useRef<Record<string, Promise<unknown>>>({});
  const retryCountRef = useRef<Record<string, number>>({});

  /**
   * Make a deduplicated chain request to prevent multiple in-flight requests for the same data
   * @param key - Unique key for the request
   * @param requestFn - Function to execute the request
   * @param maxRetries - Maximum number of retries
   * @returns Promise with the request result
   */
  const makeChainRequest = useCallback(async <T,>(
    key: string, 
    requestFn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> => {
    // Return existing promise if request is already in progress
    if (key in requestsInProgressRef.current) {
      return requestsInProgressRef.current[key] as Promise<T>;
    }

    // Reset retry count if it's a new request
    if (!(key in retryCountRef.current)) {
      retryCountRef.current[key] = 0;
    }

    // Create a new request promise
    const requestPromise = requestFn().catch(async (error) => {
      // Handle retry logic for certain errors
      if (retryCountRef.current[key] < maxRetries && 
         (error.message.includes('timeout') || error.message.includes('no data') || error.message.includes('0x'))) {
        
        console.log(`Retrying request ${key}, attempt ${retryCountRef.current[key] + 1}/${maxRetries}`);
        retryCountRef.current[key]++;
        
        // Wait a bit before retrying (increasing delay for each retry)
        const delay = 1000 * retryCountRef.current[key];
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Remove the failed request from in-progress tracking
        delete requestsInProgressRef.current[key];
        
        // Try again
        return makeChainRequest(key, requestFn, maxRetries);
      }
      
      // If we've exhausted retries or it's not a retriable error, propagate it
      throw error;
    });
    
    requestsInProgressRef.current[key] = requestPromise;

    try {
      return await requestPromise;
    } finally {
      // Clean up after completion
      delete requestsInProgressRef.current[key];
    }
  }, []);

  /**
   * Clear all request caches
   */
  const clearCaches = useCallback(() => {
    // Clear retry counts to allow fresh attempts
    retryCountRef.current = {};
  }, []);

  return {
    makeChainRequest,
    clearCaches
  };
} 