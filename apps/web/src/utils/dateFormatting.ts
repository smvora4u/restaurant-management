/**
 * Date formatting utilities for handling various date formats from GraphQL/database
 * Handles ISO strings, timestamps, Date objects, and other formats
 */

/** Optional IANA timezone (e.g. Asia/Kolkata) for restaurant-local wall times */
export type DateFormatOptions = { timeZone?: string };

/** Effective IANA timezone for a restaurant document; defaults to UTC */
export function getRestaurantTimeZone(
  restaurant: { settings?: { timezone?: string } } | null | undefined
): string {
  return restaurant?.settings?.timezone?.trim() || 'UTC';
}

function timeZoneFromOptions(options?: DateFormatOptions): string | undefined {
  const t = options?.timeZone?.trim();
  return t || undefined;
}

function safeLocaleDateString(date: Date, base: Intl.DateTimeFormatOptions): string {
  try {
    return date.toLocaleDateString('en-US', base);
  } catch {
    return date.toLocaleDateString('en-US', { ...base, timeZone: 'UTC' });
  }
}

function safeLocaleTimeString(date: Date, base: Intl.DateTimeFormatOptions): string {
  try {
    return date.toLocaleTimeString('en-US', base);
  } catch {
    return date.toLocaleTimeString('en-US', { ...base, timeZone: 'UTC' });
  }
}

function safeLocaleString(date: Date, base: Intl.DateTimeFormatOptions): string {
  try {
    return date.toLocaleString('en-US', base);
  } catch {
    return date.toLocaleString('en-US', { ...base, timeZone: 'UTC' });
  }
}

/**
 * Safely formats a date string/object into a readable date format
 * @param dateString - Date in various formats (string, Date, number, null, undefined)
 * @param options - Optional `timeZone` (IANA); when omitted, uses browser local (except date-only strings use UTC)
 * @returns Formatted date string or fallback text
 */
export const formatDate = (
  dateString: string | Date | number | undefined | null,
  options?: DateFormatOptions
): string => {
  if (!dateString) return 'N/A';

  const tz = timeZoneFromOptions(options);

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
      // Check if it's a date-only string (YYYY-MM-DD)
      // Date-only strings are parsed as UTC midnight, so we use UTC methods for consistency
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        date = new Date(dateString + 'T00:00:00.000Z');
      }
      // Check if it's a numeric string (Unix timestamp)
      else {
        const numericValue = Number(dateString);
        if (!isNaN(numericValue) && numericValue > 0) {
          // It's a Unix timestamp as a string
          date = new Date(numericValue);
        } else {
          // It's a regular date string (ISO format, etc.)
          date = new Date(dateString);
        }
      }
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date received:', dateString, 'Type:', typeof dateString);
      return 'Invalid Date';
    }

    // For date-only strings, default to UTC when no timeZone (avoids off-by-one); explicit TZ when provided
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return safeLocaleDateString(date, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: tz ?? 'UTC'
      });
    }

    const base: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(tz ? { timeZone: tz } : {})
    };
    return safeLocaleDateString(date, base);
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
    return 'Invalid Date';
  }
};

/**
 * Safely formats a date string/object into both date and time components
 * @param dateString - Date in various formats (string, Date, number, null, undefined)
 * @param options - Optional `timeZone` (IANA); when omitted, uses browser local
 * @returns Object with formatted date and time strings
 */
export const formatDateTime = (
  dateString: string | Date | number | undefined | null,
  options?: DateFormatOptions
): { date: string; time: string } => {
  if (!dateString) return { date: 'N/A', time: 'N/A' };

  const tz = timeZoneFromOptions(options);

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

    const dateOpts: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(tz ? { timeZone: tz } : {})
    };
    const timeOpts: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...(tz ? { timeZone: tz } : {})
    };

    return {
      date: safeLocaleDateString(date, dateOpts),
      time: safeLocaleTimeString(date, timeOpts)
    };
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
    return { date: 'Invalid Date', time: 'Invalid Time' };
  }
};

/**
 * Formats a date with full date and time in a single string
 * @param dateString - Date in various formats (string, Date, number, null, undefined)
 * @param options - Optional `timeZone` (IANA); when omitted, uses browser local
 * @returns Formatted date and time string
 */
export const formatFullDateTime = (
  dateString: string | Date | number | undefined | null,
  options?: DateFormatOptions
): string => {
  if (!dateString) return 'N/A';

  const tz = timeZoneFromOptions(options);

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

    const base: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...(tz ? { timeZone: tz } : {})
    };
    return safeLocaleString(date, base);
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
 * Converts various date inputs to a timestamp (ms).
 * Returns null for invalid inputs.
 */
export const toTimestamp = (dateInput: string | Date | number | undefined | null): number | null => {
  if (dateInput === undefined || dateInput === null || dateInput === '') return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput.getTime();
  }
  if (typeof dateInput === 'number') {
    return Number.isFinite(dateInput) ? dateInput : null;
  }
  const trimmed = dateInput.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const numericValue = Number(trimmed);
    return Number.isFinite(numericValue) ? numericValue : null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const utcDate = new Date(trimmed + 'T00:00:00.000Z');
    return isNaN(utcDate.getTime()) ? null : utcDate.getTime();
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed.getTime();
};

/**
 * Converts a timestamp input to YYYY-MM-DD for date input fields.
 */
export const timestampToInputDate = (dateInput: string | Date | number | undefined | null): string => {
  const timestamp = toTimestamp(dateInput);
  if (timestamp === null) return '';
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Converts an ISO date string or date-only string to local date string (YYYY-MM-DD) for date input fields
 * This ensures the date input shows the correct date regardless of timezone.
 * Handles both ISO strings (e.g., "2024-01-15T10:30:00.000Z") and date-only strings (e.g., "2024-01-15").
 * For date-only strings, returns them as-is since they're already in the correct format.
 * For ISO strings, extracts the UTC date part to avoid timezone shifts.
 * 
 * @param dateString - ISO date string (e.g., "2024-01-15T10:30:00.000Z") or date-only string (e.g., "2024-01-15")
 * @returns Date string in YYYY-MM-DD format
 */
export const isoToLocalDateString = (dateString: string): string => {
  // If it's already a date-only string (YYYY-MM-DD), return it as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Otherwise, parse as ISO string and extract UTC date part
  // Using UTC methods ensures we get the correct date regardless of browser timezone
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Checks if a date falls on "today" in a given IANA timezone.
 * Uses the restaurant's timezone so kitchen staff see correct day boundaries
 * regardless of their browser/client timezone.
 * Falls back to local-time comparison if timezone is invalid.
 * @param date - Date to check (string, Date, or undefined)
 * @param timezone - IANA timezone string (e.g. 'America/New_York', 'UTC')
 * @returns true if the date is today in the given timezone
 */
export const isTodayInTimezone = (
  date: string | Date | undefined,
  timezone: string = 'UTC'
): boolean => {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const isTodayLocal = () =>
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  try {
    if (!timezone || timezone.trim() === '') return isTodayLocal();
    const format = (dt: Date) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(dt);
    return format(d) === format(now);
  } catch {
    return isTodayLocal();
  }
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
