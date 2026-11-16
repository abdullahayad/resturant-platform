import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, baghdadClock } from '../common/baghdadTime';
import type { RamadanSettingsDto } from './ramadan.dto';

const KEY = 'ramadan';
// The Home card starts counting down this many days before the first day.
export const COUNTDOWN_DAYS = 7;

export interface RamadanSettings {
  enabled: boolean;
  startDate: string;
  endDate: string;
  iftarEventTypeId: string | null;
  suhoorMoodId: string | null;
}

const DEFAULTS: RamadanSettings = {
  enabled: false,
  startDate: '2027-02-08',
  endDate: '2027-03-09',
  iftarEventTypeId: null,
  suhoorMoodId: null,
};

// Whole days from a to b (both "YYYY-MM-DD").
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

// Ramadan mode for the customer app's Home: switched on by the admin, it
// shows a countdown the week before, then "day N" with iftar/suhoor
// shortcuts until the last day. Prayer times are worked out on the phone.
@Injectable()
export class RamadanService {
  constructor(private readonly prisma: PrismaService) {}

  async settings(): Promise<RamadanSettings> {
    const row = await this.prisma.db.appSetting.findUnique({ where: { key: KEY } });
    return { ...DEFAULTS, ...((row?.value as Partial<RamadanSettings> | undefined) ?? {}) };
  }

  async update(dto: RamadanSettingsDto): Promise<RamadanSettings> {
    if (dto.endDate < dto.startDate) throw new BadRequestException('The last day must be on or after the first day');
    if (daysBetween(dto.startDate, dto.endDate) > 31) throw new BadRequestException('Ramadan is at most 30 days');
    const value: RamadanSettings = {
      enabled: dto.enabled,
      startDate: dto.startDate,
      endDate: dto.endDate,
      iftarEventTypeId: dto.iftarEventTypeId ?? null,
      suhoorMoodId: dto.suhoorMoodId ?? null,
    };
    await this.prisma.db.appSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: { ...value } },
      update: { value: { ...value } },
    });
    return value;
  }

  // What the app's Home needs right now, or { phase: 'off' }.
  async status(now = new Date()) {
    const s = await this.settings();
    const today = baghdadClock(now).date;
    if (!s.enabled || today > s.endDate || today < addDays(s.startDate, -COUNTDOWN_DAYS)) return { phase: 'off' as const };

    const [iftarEventType, suhoorMood] = await Promise.all([
      s.iftarEventTypeId
        ? this.prisma.db.eventType.findFirst({
            where: { id: s.iftarEventTypeId, isActive: true },
            select: { id: true, nameEn: true, nameAr: true, icon: true },
          })
        : null,
      s.suhoorMoodId
        ? this.prisma.db.mood.findFirst({
            where: { id: s.suhoorMoodId, isActive: true },
            select: { id: true, nameEn: true, nameAr: true, emoji: true },
          })
        : null,
    ]);
    const base = { startDate: s.startDate, endDate: s.endDate, iftarEventType, suhoorMood };
    if (today < s.startDate) return { phase: 'countdown' as const, daysUntil: daysBetween(today, s.startDate), ...base };
    return {
      phase: 'ramadan' as const,
      day: daysBetween(s.startDate, today) + 1,
      totalDays: daysBetween(s.startDate, s.endDate) + 1,
      ...base,
    };
  }
}
