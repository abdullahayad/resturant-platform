import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CriticsService } from './critics.service';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { isCritic } from './customer-levels';

describe('isCritic', () => {
  const base = { isPublic: true, criticHidden: false, isStar: false, blockedAt: null };

  it('needs a public profile and Level 4 (25 visits), or a LiGETA Star', () => {
    expect(isCritic(base, 25)).toBe(true);
    expect(isCritic(base, 24)).toBe(false);
    expect(isCritic({ ...base, isStar: true }, 0)).toBe(true);
    expect(isCritic({ ...base, isPublic: false }, 80)).toBe(false);
  });

  it('is lost when an admin hides the status or blocks the account', () => {
    expect(isCritic({ ...base, criticHidden: true }, 80)).toBe(false);
    expect(isCritic({ ...base, blockedAt: new Date() }, 80)).toBe(false);
  });
});

describe('CriticsService', () => {
  let service: CriticsService;
  let prisma: {
    db: {
      review: { findUnique: jest.Mock };
      reviewHelpfulVote: { deleteMany: jest.Mock; create: jest.Mock; count: jest.Mock };
      customer: { findUnique: jest.Mock };
      criticFollow: { create: jest.Mock };
    };
  };

  beforeEach(async () => {
    prisma = {
      db: {
        review: { findUnique: jest.fn().mockResolvedValue({ customerId: 'author', moderationStatus: 'VISIBLE' }) },
        reviewHelpfulVote: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn(),
          count: jest.fn().mockResolvedValue(3),
        },
        customer: { findUnique: jest.fn() },
        criticFollow: { create: jest.fn() },
      },
    };
    const module = await Test.createTestingModule({
      providers: [CriticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(CriticsService);
  });

  it('a helpful tap adds a vote; tapping again takes it back', async () => {
    await expect(service.toggleHelpful('me', 'r1')).resolves.toEqual({ helpful: true, count: 3 });
    expect(prisma.db.reviewHelpfulVote.create).toHaveBeenCalledWith({ data: { reviewId: 'r1', customerId: 'me' } });

    prisma.db.reviewHelpfulVote.deleteMany.mockResolvedValueOnce({ count: 1 });
    prisma.db.reviewHelpfulVote.count.mockResolvedValueOnce(2);
    await expect(service.toggleHelpful('me', 'r1')).resolves.toEqual({ helpful: false, count: 2 });
  });

  it("can't vote on your own review, follow yourself, or follow someone who isn't a critic", async () => {
    await expect(service.toggleHelpful('author', 'r1')).rejects.toThrow(BadRequestException);
    await expect(service.follow('me', 'me')).rejects.toThrow(BadRequestException);

    prisma.db.customer.findUnique.mockResolvedValueOnce({
      id: 'x',
      isPublic: true,
      criticHidden: false,
      isStar: false,
      blockedAt: null,
      specialtyIds: [],
      _count: { visits: 5, reviews: 0, criticFollowers: 0 },
    });
    await expect(service.follow('me', 'x')).rejects.toThrow(NotFoundException);
    expect(prisma.db.criticFollow.create).not.toHaveBeenCalled();
  });
});

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: {
    db: {
      review: { findUnique: jest.Mock; update: jest.Mock };
      report: {
        findFirst: jest.Mock;
        create: jest.Mock;
        findUnique: jest.Mock;
        update: jest.Mock;
        updateMany: jest.Mock;
      };
      customer: { update: jest.Mock };
      $transaction: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      db: {
        review: {
          findUnique: jest.fn().mockResolvedValue({ id: 'r1', restaurantId: 'rest-1', customerId: 'author' }),
          update: jest.fn(),
        },
        report: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'rep-1', status: 'OPEN' }),
          findUnique: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
        },
        customer: { update: jest.fn() },
        $transaction: jest.fn().mockResolvedValue([]),
      },
    };
    const module = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ReportsService);
  });

  it("records the reporter and the review's author", async () => {
    await service.reportByCustomer('me', 'r1', 'FAKE_REVIEW', '  never went there ');
    expect(prisma.db.report.create).toHaveBeenCalledWith({
      data: {
        reviewId: 'r1',
        reason: 'FAKE_REVIEW',
        note: 'never went there',
        reporterCustomerId: 'me',
        reportedCustomerId: 'author',
      },
      select: { id: true, status: true },
    });
  });

  it('lets a restaurant report only reviews about itself', async () => {
    await expect(service.reportByRestaurant('other-rest', 'r1', 'SPAM')).rejects.toThrow(NotFoundException);
    await expect(service.reportByRestaurant('rest-1', 'r1', 'SPAM')).resolves.toEqual({ id: 'rep-1', status: 'OPEN' });
  });

  it("can't block the author of a review written without an account", async () => {
    prisma.db.report.findUnique.mockResolvedValueOnce({
      id: 'rep-1',
      status: 'OPEN',
      reviewId: 'r1',
      reason: 'SPAM',
      reportedCustomerId: null,
    });
    await expect(service.adminResolve('rep-1', 'admin-1', 'BLOCK_CUSTOMER')).rejects.toThrow(BadRequestException);
    expect(prisma.db.$transaction).not.toHaveBeenCalled();
  });

  it('hiding the review settles every open report about it', async () => {
    prisma.db.report.findUnique.mockResolvedValueOnce({
      id: 'rep-1',
      status: 'OPEN',
      reviewId: 'r1',
      reason: 'ABUSIVE',
      reportedCustomerId: 'author',
    });
    await expect(service.adminResolve('rep-1', 'admin-1', 'HIDE_REVIEW')).resolves.toEqual({
      id: 'rep-1',
      status: 'ACTIONED',
    });
    expect(prisma.db.review.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { moderationStatus: 'HIDDEN' } });
    const [{ where }] = prisma.db.report.updateMany.mock.calls[0] as [{ where: object }];
    expect(where).toEqual({ reviewId: 'r1', status: 'OPEN' });
    expect(prisma.db.customer.update).not.toHaveBeenCalled();
  });
});
