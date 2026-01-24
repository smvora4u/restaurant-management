/**
 * Date utility functions for parsing and handling dates
 */

/**
 * Parses a YYYY-MM-DD date string as a UTC date (at UTC midnight)
 * This ensures that dates from date input fields are interpreted correctly
 * regardless of the server's timezone. By using UTC midnight, the date
 * remains consistent when serialized to ISO format and deserialized in different timezones.
 * 
 * @param dateString - Date string in YYYY-MM-DD format (e.g., "2024-12-04")
 * @returns Date object representing the date at UTC midnight
 * @throws Error if dateString is not in YYYY-MM-DD format
 * 
 * @example
 * // User selects "2024-12-04"
 * // parseLocalDateString("2024-12-04") returns Date for Dec 4, 2024 00:00:00 UTC
 * // When serialized to ISO: "2024-12-04T00:00:00.000Z"
 * // When parsed in any timezone, the date part remains Dec 4, 2024
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
  
  // Create a Date object at UTC midnight for the given date
  // Using Date.UTC ensures the date is created in UTC, not local timezone
  // Note: month is 0-indexed in JavaScript Date constructor
  return new Date(Date.UTC(year, month - 1, day));
};

/**
 * Parses a date input that may be a timestamp, ISO string, or YYYY-MM-DD string.
 * Returns a Date object or throws if invalid.
 */
export const parseDateInput = (dateInput: string | number | Date): Date => {
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      throw new Error('Invalid date input');
    }
    return dateInput;
  }
  if (typeof dateInput === 'number') {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date input');
    }
    return date;
  }
  const trimmed = dateInput.trim();
  if (!trimmed) {
    throw new Error('Invalid date input');
  }
  if (/^\d+$/.test(trimmed)) {
    const numericValue = Number(trimmed);
    const date = new Date(numericValue);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date input');
    }
    return date;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return parseLocalDateString(trimmed);
  }
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date input');
  }
  return date;
};

/**
 * Formats a Date object as a YYYY-MM-DD string in UTC
 * This extracts the date part from a Date object, ensuring consistency
 * regardless of timezone. Useful for serializing date-only fields.
 * 
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format in UTC
 */
export const formatDateAsString = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

