import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StampCardsService } from './stamp-cards.service';

describe('StampCardsService', () => {
  let service: StampCardsService;
  const card = { restaurantId: 'r1', isActive: true, visitsRequired: 5, rewardEn: 'Free dessert', rewardAr: 'حلى مجاني' };
  const prisma = {
    db: {
      stampCard: { findUnique: jest.fn(), upsert: jest.fn() },
      stampReward: { findFirst: jest.fn(), create: jest.fn() },
      customerVisit: { count: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
      restaurant: { findMany: jest.fn() },
    },
  };
  const partner = { sub: 'r1', staffId: 's1' } as never;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.db.stampCard.findUnique.mockResolvedValue(card);
    prisma.db.stampReward.findFirst.mockResolvedValue(null);
    const module = await Test.createTestingModule({
      providers: [StampCardsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(StampCardsService);
  });

  it('counts visits as stamps and is ready at the required number', async () => {
    prisma.db.customerVisit.count.mockResolvedValueOnce(3);
    await expect(service.progress('c1', 'r1')).resolves.toMatchObject({ stamps: 3, visitsRequired: 5, ready: false });
    prisma.db.customerVisit.count.mockResolvedValueOnce(5);
    await expect(service.progress('c1', 'r1')).resolves.toMatchObject({ stamps: 5, ready: true });
  });

  it('only counts visits after the last reward', async () => {
    const at = new Date('2026-11-10T10:00:00Z');
    prisma.db.stampReward.findFirst.mockResolvedValueOnce({ createdAt: at });
    prisma.db.customerVisit.count.mockResolvedValueOnce(1);
    await service.progress('c1', 'r1');
    expect(prisma.db.customerVisit.count).toHaveBeenCalledWith({
      where: { customerId: 'c1', restaurantId: 'r1', createdAt: { gt: at } },
    });
  });

  it('has no progress when the card is off', async () => {
    prisma.db.stampCard.findUnique.mockResolvedValueOnce({ ...card, isActive: false });
    await expect(service.progress('c1', 'r1')).resolves.toBeNull();
  });

  it('hands over the reward only after a scan here today and with enough stamps', async () => {
    prisma.db.customerVisit.findUnique.mockResolvedValueOnce(null);
    await expect(service.redeem(partner, 'c1')).rejects.toBeInstanceOf(BadRequestException);

    prisma.db.customerVisit.findUnique.mockResolvedValueOnce({ id: 'v1' });
    prisma.db.customerVisit.count.mockResolvedValueOnce(4);
    await expect(service.redeem(partner, 'c1')).rejects.toBeInstanceOf(BadRequestException);

    prisma.db.customerVisit.findUnique.mockResolvedValueOnce({ id: 'v1' });
    prisma.db.customerVisit.count.mockResolvedValueOnce(5);
    await expect(service.redeem(partner, 'c1')).resolves.toMatchObject({ stamps: 0, redeemed: true });
    expect(prisma.db.stampReward.create).toHaveBeenCalledWith({
      data: { restaurantId: 'r1', customerId: 'c1', rewardEn: 'Free dessert', rewardAr: 'حلى مجاني', redeemedByStaffId: 's1' },
    });
  });

  it('needs the reward in both languages to switch on', async () => {
    await expect(
      service.update('r1', { isActive: true, visitsRequired: 5, rewardEn: 'Free tea', rewardAr: ' ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
