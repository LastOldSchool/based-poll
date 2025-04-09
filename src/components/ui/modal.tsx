"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Modal component props
 */
interface ModalProps {
  /** Modal title */
  title: string;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Modal content */
  children: React.ReactNode;
  /** Modal width (default: max-w-md) */
  maxWidth?: string;
}

/**
 * Modal component for displaying content in a dialog
 */
export function Modal({
  title,
  isOpen,
  onClose,
  children,
  maxWidth = "max-w-md"
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    // Add event listener if modal is open
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent scrolling on body
      document.body.style.overflow = "hidden";
    }

    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      // Restore scrolling on body
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  // Handle escape key to close
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    // Add event listener if modal is open
    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    // Clean up
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        ref={modalRef}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${maxWidth} overflow-hidden`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export default Modal; 