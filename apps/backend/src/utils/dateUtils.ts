/**
 * Date utility functions for parsing and handling dates
 */

/**
 * Parses a YYYY-MM-DD date string as a local date (not UTC)
 * This ensures that dates from date input fields are interpreted correctly
 * regardless of the server's timezone.
 * 
 * @param dateString - Date string in YYYY-MM-DD format (e.g., "2024-12-04")
 * @returns Date object representing the date at local midnight
 * @throws Error if dateString is not in YYYY-MM-DD format
 * 
 * @example
 * // User in EST selects "2024-12-04"
 * // parseLocalDateString("2024-12-04") returns Date for Dec 4, 2024 00:00:00 EST
 * // Instead of Dec 4, 2024 00:00:00 UTC (which would be Dec 3, 2024 19:00:00 EST)
 */
export const parseLocalDateString = (dateString: string): Date => {
  // Split the date string and parse components
  const parts = dateString.split('-');
  
  // Validate that we have exactly 3 parts (year, month, day)
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: expected YYYY-MM-DD, got "${dateString}"`);
  }
  
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  
  // Validate that all parts are valid numbers
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Invalid date format: expected YYYY-MM-DD, got "${dateString}"`);
  }
  
  // Create a Date object at local midnight for the given date
  // Note: month is 0-indexed in JavaScript Date constructor
  return new Date(year, month - 1, day);
};

