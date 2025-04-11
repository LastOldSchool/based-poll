"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

/**
 * Button variants
 */
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "transfer" | "vote";

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
export function Button({
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
  const baseClasses = "rounded-lg font-medium transition-all duration-200 flex items-center justify-center";
  
  // Size classes
  const sizeClasses = {
    sm: "text-sm px-3 py-1.5",
    md: "px-4 py-2",
    lg: "text-lg px-6 py-3",
  };
  
  // Variant classes with enhanced primary variant
  const variantClasses = {
    primary: "text-white relative overflow-hidden group",
    secondary: "bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 disabled:bg-purple-300 dark:disabled:bg-purple-800 shadow-md hover:shadow-lg",
    outline: "border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm hover:shadow-md",
    ghost: "hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 text-gray-700 dark:text-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300 dark:disabled:bg-red-800 shadow-md hover:shadow-lg",
    success: "bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:bg-green-300 dark:disabled:bg-green-800 shadow-md hover:shadow-lg",
    transfer: "bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg active:bg-orange-700 disabled:bg-orange-300 dark:disabled:bg-orange-800 shadow-md",
    vote: "bg-blue-100 text-blue-900 font-semibold hover:bg-blue-200 active:bg-blue-300 disabled:bg-blue-50 disabled:text-blue-400 dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800 dark:active:bg-blue-700 dark:disabled:bg-blue-950 dark:disabled:text-blue-300 shadow-md hover:shadow-lg",
  };
  
  // Width class
  const widthClass = fullWidth ? "w-full" : "";
  
  // Disabled and loading state
  const isDisabled = disabled || isLoading;
  
  // Construct the final className string
  const buttonClassName = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${
    isDisabled ? "cursor-not-allowed opacity-70" : ""
  } ${className}`;
  
  // Loading content
  const loadingContent = (
    <div className="flex items-center">
      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {children}
    </div>
  );
  
  // For the primary variant, render a motion button with animations
  if (variant === "primary" && !isDisabled) {
    // Extract event handlers that might conflict with Framer Motion's types
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { onDrag, onDragEnd, onDragStart, ...restProps } = props;
    
    return (
      <motion.button
        className={buttonClassName}
        disabled={isDisabled}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        {...restProps as HTMLMotionProps<"button">}
      >
        <div className="relative z-10">
          {isLoading ? loadingContent : children}
        </div>

        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg" />
        
        {/* Hover gradient effect */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-500 opacity-0 group-hover:opacity-100"
          initial={{ x: "-100%" }}
          whileHover={{ x: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
        
        {/* Shine effect */}
        <motion.div 
          className="absolute top-0 left-0 w-full h-full bg-white opacity-10"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)" }}
          animate={{ x: "100%" }}
          initial={{ x: "-100%" }}
          transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.5 }}
        />
        
        {/* Glow effect */}
        <motion.div 
          className="absolute -inset-1 opacity-20 rounded-lg blur-md"
          animate={{ 
            background: ["rgba(59, 130, 246, 0.5)", "rgba(79, 70, 229, 0.5)", "rgba(59, 130, 246, 0.5)"] 
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.button>
    );
  }
  
  // Regular button for other variants
  return (
    <button
      className={buttonClassName}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? loadingContent : children}
    </button>
  );
} 