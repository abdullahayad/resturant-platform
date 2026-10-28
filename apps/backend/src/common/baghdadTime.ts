// The weekday and "HH:mm" a person in Iraq sees on their own clock right
// now - what every opening hour, happy hour and recurring schedule in the
// app is written in. The server itself runs on UTC (Render), so plain
// getDay()/getHours() would be 3 hours behind. Iraq has stayed on UTC+3 all
// year since it dropped daylight saving in 2008, so a fixed offset is exact.
const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;

export function baghdadClock(now: Date): { day: number; time: string; date: string } {
  const t = new Date(now.getTime() + BAGHDAD_OFFSET_MS);
  const time = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
  return { day: t.getUTCDay(), time, date: t.toISOString().slice(0, 10) };
}

// "2026-10-28" + 3 -> "2026-10-31", and the weekday of such a date. Pure
// calendar arithmetic on the date itself, so no timezone can shift it.
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
