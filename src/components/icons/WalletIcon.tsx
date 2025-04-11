import React from "react";

/**
 * Wallet icon component
 * @param className - Optional CSS class name
 * @param size - Icon size in pixels
 */
export function WalletIcon({ className = "", size = 20 }: { className?: string; size?: number }) {
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
      className={`wallet-icon ${className}`}
    >
      {/* Base wallet */}
      <path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" />
      
      {/* Card slot/flap */}
      <path d="M22 10H18C16.9 10 16 10.9 16 12V14C16 15.1 16.9 16 18 16H22V10Z" />
      
      {/* Card access button */}
      <circle cx="18" cy="13" r="1" />
    </svg>
  );
}

export default WalletIcon; 