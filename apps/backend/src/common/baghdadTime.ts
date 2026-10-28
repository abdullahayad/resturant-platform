// The weekday and "HH:mm" a person in Iraq sees on their own clock right
// now - what every opening hour, happy hour and recurring schedule in the
// app is written in. The server itself runs on UTC (Render), so plain
// getDay()/getHours() would be 3 hours behind. Iraq has stayed on UTC+3 all
// year since it dropped daylight saving in 2008, so a fixed offset is exact.
const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;

export function baghdadClock(now: Date): { day: number; time: string } {
  const t = new Date(now.getTime() + BAGHDAD_OFFSET_MS);
  const time = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
  return { day: t.getUTCDay(), time };
}
