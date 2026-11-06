import { CustomerNotificationsService } from '../push/customer-notifications.service';
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminCustomersService } from './admin-customers.service';
import { CustomerSupportService } from './customer-support.service';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminCustomersService', () => {
  let service: AdminCustomersService;
  let prisma: {
    db: {
      customer: { findUnique: jest.Mock; findMany: jest.Mock; count: jest.Mock; update: jest.Mock };
      customerVisit: { groupBy: jest.Mock };
      chefTableBooking: { findMany: jest.Mock };
    };
  };

  beforeEach(async () => {
    prisma = {
      db: {
        customer: {
          findUnique: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn(),
        },
        customerVisit: { groupBy: jest.fn() },
        chefTableBooking: { findMany: jest.fn().mockResolvedValue([]) },
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        AdminCustomersService,
        { provide: PrismaService, useValue: prisma },
        { provide: CustomersService, useValue: { remove: jest.fn() } },
      ],
    }).compile();
    service = module.get(AdminCustomersService);
  });

  it('records who blocked a customer and why', async () => {
    prisma.db.customer.findUnique.mockResolvedValueOnce({ id: 'c1' }).mockResolvedValueOnce({
      id: 'c1',
      phone: '07701234567',
      _count: { visits: 0, reviews: 0, follows: 0, supportTickets: 0 },
    });

    await service.block('c1', 'admin-1', '  Fake reviews  ');

    const [{ data }] = prisma.db.customer.update.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(data).toMatchObject({ blockedReason: 'Fake reviews', blockedById: 'admin-1' });
    expect(data.blockedAt).toBeInstanceOf(Date);
  });

  it('counts customers per level (no visits = Level 1) and finds who is about to level up', async () => {
    prisma.db.customerVisit.groupBy.mockResolvedValueOnce([
      { customerId: 'a', _count: { _all: 24 } }, // level 3, 1 away from level 4
      { customerId: 'b', _count: { _all: 3 } }, // level 2
      { customerId: 'c', _count: { _all: 1 } }, // level 1, 2 away from level 2
    ]);
    prisma.db.customer.count.mockResolvedValueOnce(5); // 2 have no visits yet
    prisma.db.customer.findMany.mockResolvedValueOnce([
      { id: 'a', name: 'A', phone: '0770', isPublic: false, createdAt: new Date() },
      { id: 'c', name: 'C', phone: '0771', isPublic: false, createdAt: new Date() },
    ]);

    const result = await service.levels();

    expect(result.distribution.map((d) => d.customers)).toEqual([3, 1, 1, 0, 0]);
    expect(result.nearNextLevel.map((c) => c.id)).toEqual(['a', 'c']);
  });

  it('refuses unknown customers', async () => {
    prisma.db.customer.findUnique.mockResolvedValueOnce(null);
    await expect(service.unblock('missing')).rejects.toThrow(NotFoundException);
  });
});

describe('CustomerSupportService', () => {
  let service: CustomerSupportService;
  let prisma: {
    db: {
      customerSupportTicket: {
        count: jest.Mock;
        create: jest.Mock;
        findFirst: jest.Mock;
        update: jest.Mock;
        findUnique: jest.Mock;
      };
      restaurant: { findUnique: jest.Mock };
      chefTableBooking: { findMany: jest.Mock };
      customerVisit: { findMany: jest.Mock };
    };
  };

  beforeEach(async () => {
    prisma = {
      db: {
        customerSupportTicket: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue({ id: 't1' }),
          findFirst: jest.fn().mockResolvedValue({ id: 't1' }),
          update: jest.fn().mockResolvedValue({ customerId: 'c1' }),
          findUnique: jest.fn().mockResolvedValue({ id: 't1', customer: { id: 'c1', phone: '0770' } }),
        },
        restaurant: { findUnique: jest.fn() },
        chefTableBooking: { findMany: jest.fn().mockResolvedValue([]) },
        customerVisit: { findMany: jest.fn().mockResolvedValue([]) },
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        CustomerSupportService,
        { provide: PrismaService, useValue: prisma },
        { provide: CustomerNotificationsService, useValue: { supportReplied: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    service = module.get(CustomerSupportService);
  });

  it('caps how many conversations a customer keeps open', async () => {
    prisma.db.customerSupportTicket.count.mockResolvedValueOnce(5);
    await expect(service.open('c1', 'OTHER', 'hello')).rejects.toThrow(BadRequestException);
    expect(prisma.db.customerSupportTicket.create).not.toHaveBeenCalled();
  });

  it('a customer message reopens the conversation; an admin reply waits on the customer', async () => {
    await service.customerReply('c1', 't1', ' thanks ');
    let [{ data }] = prisma.db.customerSupportTicket.update.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(data).toEqual({ status: 'OPEN', messages: { create: { text: 'thanks' } } });

    await service.adminReply('t1', 'admin-1', 'On it');
    [{ data }] = prisma.db.customerSupportTicket.update.mock.calls[1] as [{ data: Record<string, unknown> }];
    expect(data).toEqual({ status: 'WAITING', messages: { create: { text: 'On it', fromAdminId: 'admin-1' } } });
  });

  it("never lets a customer reach someone else's conversation", async () => {
    prisma.db.customerSupportTicket.findFirst.mockResolvedValueOnce(null);
    await expect(service.customerReply('c2', 't1', 'hi')).rejects.toThrow(NotFoundException);
    expect(prisma.db.customerSupportTicket.update).not.toHaveBeenCalled();
  });
});
