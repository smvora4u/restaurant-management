/**
 * Normalizes a phone number by stripping non-digit characters.
 * Used for duplicate detection (e.g. waitlist) so "123-456-7890" and "1234567890" match.
 */
export function normalizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/\D/g, '');
}
