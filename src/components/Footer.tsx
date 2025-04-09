"use client";

/**
 * Footer component for the application
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-auto py-6 border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© {currentYear} Based Poll. All rights reserved.</p>
      </div>
    </footer>
  );
} 