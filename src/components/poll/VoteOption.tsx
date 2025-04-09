"use client";

import React from "react";
import { cn } from "../../lib/utils";
import { CheckCircle2 } from "lucide-react";

interface VoteOptionProps {
  option: string;
  optionId: number;
  isSelected: boolean;
  onSelect: (optionId: number) => void;
  disabled?: boolean;
}

/**
 * VoteOption component - displays a selectable option for a poll
 * @param option - Text of the option
 * @param optionId - ID of the option
 * @param isSelected - Whether the option is selected
 * @param onSelect - Function to call when option is selected
 * @param disabled - Whether the option is disabled
 */
export function VoteOption({
  option,
  optionId,
  isSelected,
  onSelect,
  disabled = false,
}: VoteOptionProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(optionId)}
      disabled={disabled}
      className={cn(
        "w-full p-4 flex items-center justify-between rounded-md border text-left transition-all",
        "hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary",
        isSelected
          ? "border-primary bg-primary/10 text-primary"
          : "border-gray-200 text-gray-700",
        disabled && "opacity-60 cursor-not-allowed hover:bg-white hover:border-gray-200"
      )}
    >
      <span className="font-medium">{option}</span>
      {isSelected && (
        <CheckCircle2 className="h-5 w-5 text-primary" />
      )}
    </button>
  );
} 