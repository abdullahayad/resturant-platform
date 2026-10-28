import type { HoursRow } from './api';

// 12500 -> "12,500". Done by hand rather than toLocaleString, whose
// grouping varies between Android versions.
export function formatIqd(amount: number | string): string {
  return String(Math.round(Number(amount))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Every time in the app (opening hours, events, offers) is Baghdad's clock.
// Iraq is UTC+3 all year, so this is right even on a phone set to another
// timezone - same rule as the server's baghdadTime.ts.
export function baghdadNow(now = new Date()): { day: number; time: string; date: string } {
  const t = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const time = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
  return { day: t.getUTCDay(), time, date: t.toISOString().slice(0, 10) };
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

// "18:30" -> "6:30" + pm flag, for "6:30 م" / "6:30 PM".
export function to12h(time: string): { clock: string; pm: boolean } {
  const [h, m] = time.split(':').map(Number);
  return { clock: `${h % 12 || 12}:${String(m).padStart(2, '0')}`, pm: h >= 12 };
}

// Same rules as the server's open-now.ts: a closing time at or before the
// opening time runs past midnight.
export function isOpenNow(hours: HoursRow[], now = new Date()): boolean | null {
  if (!hours.length) return null;
  const { day, time } = baghdadNow(now);
  const usable = (h?: HoursRow): h is HoursRow & { openTime: string; closeTime: string } =>
    !!h && !h.isClosed && !!h.openTime && !!h.closeTime;
  const crosses = (h: { openTime: string; closeTime: string }) => h.closeTime <= h.openTime;
  const today = hours.find((h) => h.dayOfWeek === day);
  const yesterday = hours.find((h) => h.dayOfWeek === (day + 6) % 7);
  if (usable(today) && (crosses(today) ? time >= today.openTime : time >= today.openTime && time < today.closeTime)) {
    return true;
  }
  return usable(yesterday) && crosses(yesterday) && time < yesterday.closeTime;
}

// Iraqi mobile numbers as typed (0770..., +964 770..., 964770...) -> the
// international form WhatsApp links need ("9647701234567"), or null.
export function toWhatsAppNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (/^07\d{9}$/.test(digits)) return `964${digits.slice(1)}`;
  if (/^9647\d{9}$/.test(digits)) return digits;
  if (/^7\d{9}$/.test(digits)) return `964${digits}`;
  return null;
}

export function isIraqiMobile(phone: string): boolean {
  return toWhatsAppNumber(phone) !== null;
}

// A random id for "this booking attempt", so a double tap on Book never
// books twice. Not a secret, so Math.random is fine here.
export function randomId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
