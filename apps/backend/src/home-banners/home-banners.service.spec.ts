import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HomeBannersService } from './home-banners.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HomeBannersService', () => {
  let service: HomeBannersService;
  let prisma: { db: { homeBanner: { findMany: jest.Mock; create: jest.Mock; aggregate: jest.Mock } } };

  beforeEach(async () => {
    prisma = {
      db: {
        homeBanner: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn(),
          aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 4 } }),
        },
      },
    };
    const module = await Test.createTestingModule({
      providers: [HomeBannersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(HomeBannersService);
  });

  it('shows only switched-on banners inside their dates', async () => {
    const now = new Date('2026-11-03T12:00:00Z');
    await service.listActive(now);
    const [{ where }] = prisma.db.homeBanner.findMany.mock.calls[0] as [{ where: object }];
    expect(where).toEqual({
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    });
  });

  it('puts a new banner at the end of the list', async () => {
    await service.create({ titleEn: 'Ramadan', titleAr: 'رمضان' });
    const [{ data }] = prisma.db.homeBanner.create.mock.calls[0] as [{ data: { sortOrder: number } }];
    expect(data.sortOrder).toBe(5);
  });

  it('needs a target for restaurant/mood links and an end after the start', async () => {
    await expect(service.create({ titleEn: 'x', titleAr: 'x', linkType: 'RESTAURANT' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.create({
        titleEn: 'x',
        titleAr: 'x',
        startsAt: new Date('2026-11-10'),
        endsAt: new Date('2026-11-01'),
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
