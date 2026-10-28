// Opening-hours checks for the customer app, always in Baghdad time -
// the server runs in UTC, and a restaurant's "09:00-23:00" means Baghdad's
// clock, not the server's. Iraq has stayed on UTC+3 all year since it
// dropped daylight saving in 2008, so a fixed offset is exact.
const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;

export interface HoursRow {
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
  isClosed: boolean;
  openTime: string | null; // "HH:mm"
  closeTime: string | null; // "HH:mm"
}

export function baghdadClock(now: Date): { day: number; time: string } {
  const t = new Date(now.getTime() + BAGHDAD_OFFSET_MS);
  const time = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
  return { day: t.getUTCDay(), time };
}

// A day whose closing time is at or before its opening time runs past
// midnight into the next day (e.g. "18:00-02:00"). "00:00-00:00" counts too
// and means open around the clock.
function crossesMidnight(row: HoursRow): boolean {
  return !!row.openTime && !!row.closeTime && row.closeTime <= row.openTime;
}

function isUsable(row: HoursRow | undefined): row is HoursRow & { openTime: string; closeTime: string } {
  return !!row && !row.isClosed && !!row.openTime && !!row.closeTime;
}

// null when the restaurant never filled in its hours - the app shows
// nothing then, rather than wrongly saying "Closed".
export function isOpenAt(hours: HoursRow[], now: Date): boolean | null {
  if (!hours.length) return null;
  const { day, time } = baghdadClock(now);
  const today = hours.find((h) => h.dayOfWeek === day);
  const yesterday = hours.find((h) => h.dayOfWeek === (day + 6) % 7);

  if (isUsable(today)) {
    if (crossesMidnight(today) ? time >= today.openTime : time >= today.openTime && time < today.closeTime) {
      return true;
    }
  }
  // Still inside last night's late shift (e.g. 01:00 after an "18:00-02:00" day).
  if (isUsable(yesterday) && crossesMidnight(yesterday) && time < yesterday.closeTime) return true;
  return false;
}

// For the "Late night" style moods: open past midnight on at least one day.
export function opensAfterMidnight(hours: HoursRow[]): boolean {
  return hours.some((h) => isUsable(h) && crossesMidnight(h));
}
