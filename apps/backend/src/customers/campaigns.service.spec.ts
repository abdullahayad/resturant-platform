import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

describe('CampaignsService', () => {
  let service: CampaignsService;
  let prisma: {
    db: {
      customer: { findMany: jest.Mock };
      customerVisit: { groupBy: jest.Mock };
      customerCampaignDelivery: { groupBy: jest.Mock };
      customerCampaign: { create: jest.Mock };
    };
  };
  let push: { sendToCustomers: jest.Mock };

  beforeEach(async () => {
    prisma = {
      db: {
        customer: { findMany: jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]) },
        customerVisit: { groupBy: jest.fn().mockResolvedValue([]) },
        customerCampaignDelivery: { groupBy: jest.fn().mockResolvedValue([]) },
        customerCampaign: { create: jest.fn().mockResolvedValue({ id: 'camp', recipientCount: 2 }) },
      },
    };
    push = { sendToCustomers: jest.fn().mockResolvedValue(2) };
    const module = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PushService, useValue: push },
      ],
    }).compile();
    service = module.get(CampaignsService);
  });

  it('only targets customers who allow campaigns, have the app and are not blocked', async () => {
    await service.audience({ followersOfRestaurantId: 'r1' });
    const [{ where }] = prisma.db.customer.findMany.mock.calls[0] as [{ where: object }];
    expect(where).toEqual({
      notifyCampaigns: true,
      blockedAt: null,
      pushTokens: { some: {} },
      follows: { some: { restaurantId: 'r1' } },
    });
  });

  it('skips anyone who already got 2 campaigns this week, and filters by level', async () => {
    prisma.db.customerVisit.groupBy.mockResolvedValueOnce([
      { customerId: 'a', _count: { _all: 30 } },
      { customerId: 'b', _count: { _all: 12 } },
      { customerId: 'c', _count: { _all: 1 } },
    ]);
    prisma.db.customerCampaignDelivery.groupBy.mockResolvedValueOnce([{ customerId: 'a', _count: { _all: 2 } }]);

    await expect(service.audience({ minLevel: 3 })).resolves.toEqual(['b']);
  });

  it('sends to the audience with a link the app can open, and refuses an empty audience', async () => {
    await service.send(
      {
        titleEn: 'Grill week',
        titleAr: 'أسبوع المشاوي',
        bodyEn: 'x',
        bodyAr: 'x',
        linkType: 'RESTAURANT',
        linkValue: 'r9',
      },
      'admin-1',
    );
    expect(push.sendToCustomers).toHaveBeenCalledWith(['a', 'b', 'c'], expect.anything(), {
      screen: 'restaurant',
      id: 'r9',
    });

    prisma.db.customer.findMany.mockResolvedValueOnce([]);
    await expect(service.send({ titleEn: 'x', titleAr: 'x', bodyEn: 'x', bodyAr: 'x' }, 'admin-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('PushService.sendToCustomers', () => {
  it('sends each phone its own language and forgets phones that uninstalled', async () => {
    const prisma = {
      db: {
        customerPushToken: {
          findMany: jest.fn().mockResolvedValue([
            { token: 'ExponentPushToken[ar]', language: 'ar' },
            { token: 'ExponentPushToken[gone]', language: 'en' },
          ]),
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      },
    };
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      status: 200,
      json: () =>
        Promise.resolve({ data: [{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }] }),
    } as unknown as Response);
    const module = await Test.createTestingModule({
      providers: [PushService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const push = module.get(PushService);

    await push.sendToCustomers(['c1'], { titleEn: 'Hi', titleAr: 'هلا', bodyEn: 'b', bodyAr: 'ب' });

    const [, init] = fetchMock.mock.calls[0];
    const sent = JSON.parse((init as RequestInit).body as string) as { title: string }[];
    expect(sent.map((m) => m.title)).toEqual(['هلا', 'Hi']);
    expect(prisma.db.customerPushToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['ExponentPushToken[gone]'] } },
    });
    fetchMock.mockRestore();
  });
});
