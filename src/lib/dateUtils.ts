import { format, isValid } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

/**
 * Safely parses a value into a Date object.
 * Handles Firebase Timestamps, Date objects, and strings.
 */
export function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;

  let date: Date;

  // Handle Firebase Timestamp
  if (dateValue instanceof Timestamp || (typeof dateValue === 'object' && dateValue?.seconds)) {
    date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue.seconds * 1000);
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    // Try to parse string
    date = new Date(dateValue);
  }

  return isValid(date) ? date : null;
}

/**
 * Safely formats a date object, string, or Firebase Timestamp.
 * Returns a fallback string if the date is invalid.
 */
export function safelyFormatDate(dateValue: any, formatStr: string = 'MMM d, yyyy', fallback: string = 'N/A'): string {
  const date = parseDate(dateValue);
  if (!date) return fallback;

  try {
    return format(date, formatStr);
  } catch (error) {
    console.error('Date formatting error:', error);
    return fallback;
  }
}
