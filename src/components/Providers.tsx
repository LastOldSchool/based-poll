"use client";

import { ReactNode } from "react";
import ContextProvider from "@/context";

/**
 * Client-side provider wrapper for the application
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 * @returns {ReactNode} The provider component
 */
export default function Providers({ 
  children
}: { 
  children: ReactNode;
}): ReactNode {
  return <ContextProvider>{children}</ContextProvider>;
} 