// Normalizes Iraqi mobile numbers to a canonical local form (0XXXXXXXXXX) so
// the same guest is recognized across restaurants regardless of how staff
// typed their number (with/without +964, spaces, dashes). Used everywhere a
// guest phone number is written or looked up for the loyalty program — see
// loyalty/loyalty.service.ts and events/events.service.ts.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('964') && digits.length === 13) return '0' + digits.slice(3);
  if (!digits.startsWith('0') && digits.length === 10) return '0' + digits;
  return digits;
}
