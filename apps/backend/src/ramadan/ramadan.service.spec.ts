import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RamadanService } from './ramadan.service';

describe('RamadanService', () => {
  let service: RamadanService;
  let stored: object | null;
  const prisma = {
    db: {
      appSetting: {
        findUnique: jest.fn(async () => (stored ? { value: stored } : null)),
        upsert: jest.fn(),
      },
      eventType: { findFirst: jest.fn().mockResolvedValue({ id: 'e1', nameEn: 'Iftar', nameAr: 'إفطار', icon: '🌙' }) },
      mood: { findFirst: jest.fn().mockResolvedValue(null) },
    },
  };
  // Noon in Baghdad on that day.
  const at = (date: string) => new Date(`${date}T09:00:00Z`);

  beforeEach(async () => {
    stored = { enabled: true, startDate: '2027-02-08', endDate: '2027-03-09', iftarEventTypeId: 'e1', suhoorMoodId: null };
    const module = await Test.createTestingModule({
      providers: [RamadanService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(RamadanService);
  });

  it('is off when switched off or outside the dates', async () => {
    await expect(service.status(at('2027-01-20'))).resolves.toEqual({ phase: 'off' });
    await expect(service.status(at('2027-03-10'))).resolves.toEqual({ phase: 'off' });
    stored = { ...stored, enabled: false };
    await expect(service.status(at('2027-02-10'))).resolves.toEqual({ phase: 'off' });
  });

  it('counts down the week before', async () => {
    await expect(service.status(at('2027-02-03'))).resolves.toMatchObject({ phase: 'countdown', daysUntil: 5 });
  });

  it('gives the day number and the iftar event type during Ramadan', async () => {
    await expect(service.status(at('2027-02-08'))).resolves.toMatchObject({
      phase: 'ramadan',
      day: 1,
      totalDays: 30,
      iftarEventType: { id: 'e1' },
      suhoorMood: null,
    });
    await expect(service.status(at('2027-03-09'))).resolves.toMatchObject({ day: 30 });
  });

  it('rejects an end before the start', async () => {
    await expect(
      service.update({ enabled: true, startDate: '2027-03-01', endDate: '2027-02-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
