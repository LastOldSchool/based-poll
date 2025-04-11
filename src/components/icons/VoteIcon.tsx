import React from "react";

/**
 * Vote icon component
 * @param className - Optional CSS class name
 * @param size - Icon size in pixels
 */
export function VoteIcon({ className = "", size = 20 }: { className?: string; size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={`vote-icon ${className}`}
    >
      {/* Ballot box */}
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      
      {/* Ballot slot at top */}
      <line x1="9" y1="4" x2="9" y2="2" />
      <line x1="15" y1="4" x2="15" y2="2" />
      <line x1="9" y1="2" x2="15" y2="2" />
      
      {/* Checkmark inside */}
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

export default VoteIcon; 