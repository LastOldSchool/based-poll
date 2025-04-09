/**
 * Formats a timestamp into a relative time string (e.g., "in 2 days" or "2 days ago")
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted deadline string
 */
export function formatDeadline(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diffSeconds = timestamp - now;
  
  // Poll already ended
  if (diffSeconds <= 0) {
    const absSeconds = Math.abs(diffSeconds);
    
    if (absSeconds < 60) return `${absSeconds} seconds ago`;
    if (absSeconds < 3600) return `${Math.floor(absSeconds / 60)} minutes ago`;
    if (absSeconds < 86400) return `${Math.floor(absSeconds / 3600)} hours ago`;
    return `${Math.floor(absSeconds / 86400)} days ago`;
  }
  
  // Poll ending in the future
  if (diffSeconds < 60) return `in ${diffSeconds} seconds`;
  if (diffSeconds < 3600) return `in ${Math.floor(diffSeconds / 60)} minutes`;
  if (diffSeconds < 86400) return `in ${Math.floor(diffSeconds / 3600)} hours`;
  return `in ${Math.floor(diffSeconds / 86400)} days`;
}

/**
 * Formats a timestamp into a precise time string with hours and minutes
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted deadline string with exact hours and minutes
 */
export function formatDeadlineExact(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diffSeconds = timestamp - now;
  
  // Poll already ended
  if (diffSeconds <= 0) {
    const absSeconds = Math.abs(diffSeconds);
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    
    if (hours === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  
  // Poll ending in the future
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  
  if (hours === 0) {
    return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  return `in ${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
} 