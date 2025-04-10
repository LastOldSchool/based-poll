"use client";

import React from "react";
import { cn } from "../../lib/utils";
import { CheckCircle2 } from "lucide-react";

interface VoteOptionProps {
  id: number;
  label: string;
  selected: boolean;
  onSelect: (optionId: number) => void;
  disabled?: boolean;
}

/**
 * VoteOption component - displays a selectable option for a poll
 * @param id - ID of the option
 * @param label - Text of the option
 * @param selected - Whether the option is selected
 * @param onSelect - Function to call when option is selected
 * @param disabled - Whether the option is disabled
 */
export function VoteOption({
  id,
  label,
  selected,
  onSelect,
  disabled = false,
}: VoteOptionProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      disabled={disabled}
      className={cn(
        "w-full p-4 flex items-center justify-between rounded-md text-left transition-all duration-200",
        "shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary",
        selected
          ? "bg-primary/10 text-primary shadow-md"
          : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300",
        disabled && "opacity-60 cursor-not-allowed hover:shadow-sm"
      )}
    >
      <span className="font-medium">{label}</span>
      {selected && (
        <CheckCircle2 className="h-5 w-5 text-primary" />
      )}
    </button>
  );
} 