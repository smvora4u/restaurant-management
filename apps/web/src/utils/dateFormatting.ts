/**
 * Date formatting utilities for handling various date formats from GraphQL/database
 * Handles ISO strings, timestamps, Date objects, and other formats
 */

/**
 * Safely formats a date string/object into a readable date format
 * @param dateString - Date in various formats (string, Date, number, null, undefined)
 * @returns Formatted date string or fallback text
 */
export const formatDate = (dateString: string | Date | number | undefined | null): string => {
  if (!dateString) return 'N/A';
  
  try {
    // Handle different date formats that might come from GraphQL
    let date: Date;
    
    // If it's already a Date object
    if (dateString instanceof Date) {
      date = dateString;
    } 
    // If it's a number (Unix timestamp in milliseconds)
    else if (typeof dateString === 'number') {
      date = new Date(dateString);
    }
    // If it's a string, try to parse it
    else {
      // Check if it's a numeric string (Unix timestamp)
      const numericValue = Number(dateString);
      if (!isNaN(numericValue) && numericValue > 0) {
        // It's a Unix timestamp as a string
        date = new Date(numericValue);
      } else {
        // It's a regular date string (ISO format, etc.)
        date = new Date(dateString);
      }
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date received:', dateString, 'Type:', typeof dateString);
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
    return 'Invalid Date';
  }
};

/**
 * Safely formats a date string/object into both date and time components
 * @param dateString - Date in various formats (string, Date, number, null, undefined)
 * @returns Object with formatted date and time strings
 */
export const formatDateTime = (dateString: string | Date | number | undefined | null): { date: string; time: string } => {
  if (!dateString) return { date: 'N/A', time: 'N/A' };
  
  try {
    // Handle different date formats that might come from GraphQL
    let date: Date;
    
    // If it's already a Date object
    if (dateString instanceof Date) {
      date = dateString;
    } 
    // If it's a number (Unix timestamp in milliseconds)
    else if (typeof dateString === 'number') {
      date = new Date(dateString);
    }
    // If it's a string, try to parse it
    else {
      // Check if it's a numeric string (Unix timestamp)
      const numericValue = Number(dateString);
      if (!isNaN(numericValue) && numericValue > 0) {
        // It's a Unix timestamp as a string
        date = new Date(numericValue);
      } else {
        // It's a regular date string (ISO format, etc.)
        date = new Date(dateString);
      }
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date received:', dateString, 'Type:', typeof dateString);
      return { date: 'Invalid Date', time: 'Invalid Time' };
    }
    
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
    return { date: 'Invalid Date', time: 'Invalid Time' };
  }
};

/**
 * Formats a date with full date and time in a single string
 * @param dateString - Date in various formats (string, Date, number, null, undefined)
 * @returns Formatted date and time string
 */
export const formatFullDateTime = (dateString: string | Date | number | undefined | null): string => {
  if (!dateString) return 'N/A';
  
  try {
    // Handle different date formats that might come from GraphQL
    let date: Date;
    
    // If it's already a Date object
    if (dateString instanceof Date) {
      date = dateString;
    } 
    // If it's a number (Unix timestamp in milliseconds)
    else if (typeof dateString === 'number') {
      date = new Date(dateString);
    }
    // If it's a string, try to parse it
    else {
      // Check if it's a numeric string (Unix timestamp)
      const numericValue = Number(dateString);
      if (!isNaN(numericValue) && numericValue > 0) {
        // It's a Unix timestamp as a string
        date = new Date(numericValue);
      } else {
        // It's a regular date string (ISO format, etc.)
        date = new Date(dateString);
      }
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date received:', dateString, 'Type:', typeof dateString);
      return 'Invalid Date';
    }
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
    return 'Invalid Date';
  }
};

/**
 * Gets today's date in local timezone as YYYY-MM-DD format (for date input fields)
 * @returns Date string in YYYY-MM-DD format
 */
export const getLocalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Converts an ISO date string to local date string (YYYY-MM-DD) for date input fields
 * This ensures the date input shows the correct local date regardless of timezone
 * @param isoString - ISO date string (e.g., "2024-01-15T10:30:00.000Z")
 * @returns Date string in YYYY-MM-DD format in local timezone
 */
export const isoToLocalDateString = (isoString: string): string => {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a date as a relative time (e.g., "2 hours ago", "3 days ago")
 * @param dateString - Date in various formats (string, Date, number, null, undefined)
 * @returns Relative time string
 */
export const formatTimeAgo = (dateString: string | Date | number | undefined | null): string => {
  if (!dateString) return 'N/A';
  
  try {
    // Handle different date formats that might come from GraphQL
    let date: Date;
    
    // If it's already a Date object
    if (dateString instanceof Date) {
      date = dateString;
    } 
    // If it's a number (Unix timestamp in milliseconds)
    else if (typeof dateString === 'number') {
      date = new Date(dateString);
    }
    // If it's a string, try to parse it
    else {
      // Check if it's a numeric string (Unix timestamp)
      const numericValue = Number(dateString);
      if (!isNaN(numericValue) && numericValue > 0) {
        // It's a Unix timestamp as a string
        date = new Date(numericValue);
      } else {
        // It's a regular date string (ISO format, etc.)
        date = new Date(dateString);
      }
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date received:', dateString, 'Type:', typeof dateString);
      return 'Invalid Date';
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  } catch (error) {
    console.warn('Error formatting time ago:', dateString, error);
    return 'Invalid Date';
  }
};
