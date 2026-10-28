import { baghdadClock } from '../common/baghdadTime';
import { isOpenAt, opensAfterMidnight, type HoursRow } from './open-now';

// Baghdad is UTC+3, so 2026-10-28T09:30Z is Wednesday (3) 12:30 in Baghdad.
const at = (iso: string) => new Date(iso);
const day = (dayOfWeek: number, openTime: string | null, closeTime: string | null, isClosed = false): HoursRow => ({
  dayOfWeek,
  isClosed,
  openTime,
  closeTime,
});

describe('open-now', () => {
  it('reads the clock in Baghdad time, not the server time', () => {
    expect(baghdadClock(at('2026-10-28T09:30:00Z'))).toEqual({ day: 3, time: '12:30', date: '2026-10-28' });
    // 22:30 UTC Wednesday is already 01:30 Thursday in Baghdad.
    expect(baghdadClock(at('2026-10-28T22:30:00Z'))).toEqual({ day: 4, time: '01:30', date: '2026-10-29' });
  });

  it('is open inside the day window and closed outside it', () => {
    const hours = [day(3, '09:00', '23:00')];
    expect(isOpenAt(hours, at('2026-10-28T09:30:00Z'))).toBe(true); // 12:30
    expect(isOpenAt(hours, at('2026-10-28T05:00:00Z'))).toBe(false); // 08:00
    expect(isOpenAt(hours, at('2026-10-28T20:00:00Z'))).toBe(false); // 23:00 exactly
  });

  it("counts the hours after midnight from the previous day's late shift", () => {
    const hours = [day(3, '18:00', '02:00'), day(4, null, null, true)];
    expect(isOpenAt(hours, at('2026-10-28T22:30:00Z'))).toBe(true); // Thu 01:30
    expect(isOpenAt(hours, at('2026-10-28T23:30:00Z'))).toBe(false); // Thu 02:30
  });

  it('treats a closed day as closed and missing hours as unknown', () => {
    expect(isOpenAt([day(3, '09:00', '23:00', true)], at('2026-10-28T09:30:00Z'))).toBe(false);
    expect(isOpenAt([], at('2026-10-28T09:30:00Z'))).toBeNull();
  });

  it('treats 00:00-00:00 as open around the clock', () => {
    expect(isOpenAt([day(3, '00:00', '00:00')], at('2026-10-28T00:30:00Z'))).toBe(true);
  });

  it('spots restaurants that stay open past midnight', () => {
    expect(opensAfterMidnight([day(5, '12:00', '01:00')])).toBe(true);
    expect(opensAfterMidnight([day(5, '12:00', '23:30')])).toBe(false);
    expect(opensAfterMidnight([day(5, '12:00', '01:00', true)])).toBe(false);
  });
});
