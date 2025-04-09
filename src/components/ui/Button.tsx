"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Button variants
 */
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "transfer";

/**
 * Button sizes
 */
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Button component props
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button content */
  children: ReactNode;
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Full width button */
  fullWidth?: boolean;
  /** Is button in loading state */
  isLoading?: boolean;
}

/**
 * Reusable Button component
 */
export default function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  disabled = false,
  ...props
}: ButtonProps) {
  // Base classes
  const baseClasses = "rounded-lg font-medium transition-colors flex items-center justify-center";
  
  // Size classes
  const sizeClasses = {
    sm: "text-sm px-3 py-1.5",
    md: "px-4 py-2",
    lg: "text-lg px-5 py-2.5",
  };
  
  // Variant classes
  const variantClasses = {
    primary: "bg-base-blue text-white hover:bg-blue-600 active:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800",
    secondary: "bg-base-purple text-white hover:bg-purple-600 active:bg-purple-700 disabled:bg-purple-300 dark:disabled:bg-purple-800",
    outline: "border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700",
    ghost: "hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700",
    danger: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-800",
    success: "bg-green-500 text-white hover:bg-green-600 active:bg-green-700 disabled:bg-green-300 dark:disabled:bg-green-800",
    transfer: "border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white active:bg-orange-600 disabled:bg-orange-300 disabled:border-orange-300 dark:disabled:bg-orange-800",
  };
  
  // Width class
  const widthClass = fullWidth ? "w-full" : "";
  
  // Disabled and loading state
  const isDisabled = disabled || isLoading;
  
  // Construct the final className string
  const buttonClassName = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${
    isDisabled ? "cursor-not-allowed" : ""
  } ${className}`;
  
  return (
    <button
      className={buttonClassName}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {children}
        </div>
      ) : (
        children
      )}
    </button>
  );
} 