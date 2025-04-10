"use client";

import { useState, useEffect } from "react";
import { usePoll } from '@/hooks/usePoll';
import { useAccount } from "wagmi";
import { Button } from "../ui/Button";

interface Option {
  id: number;
  text: string;
}

/**
 * Form component for creating new polls
 */
export default function CreatePollForm() {
  const { isConnected } = useAccount();
  const { createPoll } = usePoll();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<Option[]>([
    { id: 1, text: "" },
    { id: 2, text: "" },
  ]);
  const [daysUntilDeadline, setDaysUntilDeadline] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure client-side only rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  const addOption = () => {
    if (options.length >= 6) return;
    const newId = Math.max(...options.map((o) => o.id)) + 1;
    setOptions([...options, { id: newId, text: "" }]);
  };

  const removeOption = (id: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((o) => o.id !== id));
  };

  const updateOption = (id: number, text: string) => {
    setOptions(
      options.map((o) => (o.id === id ? { ...o, text } : o))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for wallet connection first
    if (!isConnected) {
      window.dispatchEvent(new CustomEvent('connect-wallet'));
      return;
    }
    
    // Validation
    if (!question.trim()) {
      setError("Please enter a question");
      return;
    }
    
    const filledOptions = options.filter((o) => o.text.trim());
    if (filledOptions.length < 2) {
      setError("Please provide at least 2 options");
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      // Calculate deadline timestamp (current time + days)
      const deadline = Math.floor(Date.now() / 1000) + daysUntilDeadline * 24 * 60 * 60;
      
      // Call createPoll which now also stores in localStorage
      await createPoll(
        question,
        options.map((o) => o.text),
        deadline
      );
      
      // Reset form
      setQuestion("");
      setOptions([
        { id: 1, text: "" },
        { id: 2, text: "" },
      ]);
      setDaysUntilDeadline(1);
      setSuccessMessage("Poll created successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error("Error creating poll:", error);
      setError("Failed to create poll. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // Display a placeholder during server rendering
  if (!mounted) {
    return (
      <div className="bg-white dark:bg-base-dark border border-gray-200 dark:border-gray-800 rounded-xl p-5 md:p-6 shadow-sm">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Create a Poll</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-base-dark border border-gray-200 dark:border-gray-800 rounded-xl p-5 md:p-6 shadow-sm">
      <h2 className="text-xl md:text-2xl font-bold mb-4">Create a Poll</h2>
      
      {!isConnected ? (
        <div className="flex flex-col items-center justify-center p-6">
          <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-lg w-full text-center">
            <p>Please connect your wallet to create a poll.</p>
          </div>
          <Button 
            onClick={() => window.dispatchEvent(new CustomEvent('connect-wallet'))}
            variant="primary"
            size="lg"
          >
            Connect Wallet
          </Button>
        </div>
      ) : (
        <>
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg">
              {successMessage}
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="question" className="block text-sm font-medium mb-1">
                Question
              </label>
              <input
                type="text"
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to ask?"
                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                disabled={isCreating}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Options ({options.length}/6)
              </label>
              
              {options.map((option) => (
                <div key={option.id} className="flex mb-2">
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => updateOption(option.id, e.target.value)}
                    placeholder={`Option ${option.id}`}
                    className="flex-1 p-3 border border-gray-300 dark:border-gray-700 rounded-l-lg bg-white dark:bg-gray-800"
                    disabled={isCreating}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(option.id)}
                    disabled={options.length <= 2 || isCreating}
                    className="px-3 bg-gray-100 dark:bg-gray-700 border-y border-r border-gray-300 dark:border-gray-700 rounded-r-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              {options.length < 6 && (
                <Button
                  type="button"
                  onClick={addOption}
                  disabled={isCreating}
                  variant="ghost"
                  className="mt-2 w-full border border-dashed border-gray-300 dark:border-gray-700"
                >
                  + Add Option
                </Button>
              )}
            </div>
            
            <div className="mb-6">
              <label htmlFor="deadline" className="block text-sm font-medium mb-1">
                Poll Duration
              </label>
              <select
                id="deadline"
                value={daysUntilDeadline}
                onChange={(e) => setDaysUntilDeadline(Number(e.target.value))}
                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                disabled={isCreating}
              >
                <option value={1}>1 day</option>
                <option value={2}>2 days</option>
                <option value={3}>3 days</option>
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={30}>1 month</option>
              </select>
            </div>
            
            <Button
              type="submit"
              disabled={isCreating}
              isLoading={isCreating}
              variant="secondary"
              size="lg"
              fullWidth
            >
              Create Poll
            </Button>
          </form>
        </>
      )}
    </div>
  );
} 