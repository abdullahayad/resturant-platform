import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

describe('EventsService', () => {
  let service: EventsService;
  let prisma: { db: Record<string, Record<string, jest.Mock>> };

  const restaurantId = 'r1';
  const eventId = 'e1';

  const bookableRecurringEvent = {
    id: eventId,
    restaurantId,
    isActive: true,
    isRecurring: true,
    eventDate: null,
    recurringDayOfWeek: 5, // Friday
    capacity: 10,
    titleEn: 'Live Music Night',
    restaurant: { status: 'APPROVED', notifyNewBooking: false },
  };

  const bookableOneOffEvent = {
    id: eventId,
    restaurantId,
    isActive: true,
    isRecurring: false,
    eventDate: new Date('2026-09-10T00:00:00Z'),
    recurringDayOfWeek: null,
    capacity: 5,
    titleEn: 'Grand Opening',
    restaurant: { status: 'APPROVED', notifyNewBooking: false },
  };

  beforeEach(async () => {
    prisma = {
      db: {
        restaurantEvent: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        chefTableBooking: {
          findMany: jest.fn(),
          create: jest.fn(),
        },
        $transaction: jest.fn(),
      },
    };
    // $transaction just runs the callback with a tx that reuses the same mocks.
    prisma.db.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prisma.db));

    const module = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PushService, useValue: { sendToRestaurants: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(EventsService);
  });

  describe('availability / assertValidOccurrence', () => {
    it('accepts a date matching a recurring event\'s day of week', async () => {
      prisma.db.restaurantEvent.findUnique.mockResolvedValueOnce(bookableRecurringEvent);
      prisma.db.chefTableBooking.findMany.mockResolvedValueOnce([{ partySize: 3 }]);

      // 2026-09-11 is a Friday.
      const result = await service.availability(restaurantId, eventId, '2026-09-11');

      expect(result).toEqual({ capacity: 10, reserved: 3, remaining: 7 });
    });

    it('rejects a date that does not fall on the recurring day', async () => {
      prisma.db.restaurantEvent.findUnique.mockResolvedValueOnce(bookableRecurringEvent);

      // 2026-09-12 is a Saturday, not the event's Friday.
      await expect(service.availability(restaurantId, eventId, '2026-09-12')).rejects.toThrow(BadRequestException);
    });

    it('accepts a date matching a one-off event\'s exact date', async () => {
      prisma.db.restaurantEvent.findUnique.mockResolvedValueOnce(bookableOneOffEvent);
      prisma.db.chefTableBooking.findMany.mockResolvedValueOnce([]);

      const result = await service.availability(restaurantId, eventId, '2026-09-10');

      expect(result).toEqual({ capacity: 5, reserved: 0, remaining: 5 });
    });

    it('rejects a date that does not match a one-off event\'s date', async () => {
      prisma.db.restaurantEvent.findUnique.mockResolvedValueOnce(bookableOneOffEvent);

      await expect(service.availability(restaurantId, eventId, '2026-09-11')).rejects.toThrow(BadRequestException);
    });

    it('rejects a malformed date string', async () => {
      prisma.db.restaurantEvent.findUnique.mockResolvedValueOnce(bookableOneOffEvent);

      await expect(service.availability(restaurantId, eventId, 'not-a-date')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for an event belonging to another restaurant', async () => {
      prisma.db.restaurantEvent.findUnique.mockResolvedValueOnce({ ...bookableOneOffEvent, restaurantId: 'other' });

      await expect(service.availability(restaurantId, eventId, '2026-09-10')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for an event on a non-approved restaurant', async () => {
      prisma.db.restaurantEvent.findUnique.mockResolvedValueOnce({
        ...bookableOneOffEvent,
        restaurant: { status: 'SUSPENDED', notifyNewBooking: false },
      });

      await expect(service.availability(restaurantId, eventId, '2026-09-10')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createReservation', () => {
    it('rejects a booking that would exceed the event\'s remaining capacity', async () => {
      prisma.db.restaurantEvent.findUnique.mockResolvedValueOnce(bookableOneOffEvent);
      prisma.db.chefTableBooking.findMany.mockResolvedValueOnce([{ partySize: 4 }]); // 4 of 5 already taken

      await expect(
        service.createReservation(restaurantId, eventId, {
          guestName: 'Ali',
          guestPhone: '0770',
          partySize: 2, // would push to 6, over the 5 capacity
          reservationDate: '2026-09-10',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.db.chefTableBooking.create).not.toHaveBeenCalled();
    });

    it('allows a booking that fits within remaining capacity', async () => {
      prisma.db.restaurantEvent.findUnique.mockResolvedValueOnce(bookableOneOffEvent);
      prisma.db.chefTableBooking.findMany.mockResolvedValueOnce([{ partySize: 2 }]); // 2 of 5 taken
      prisma.db.chefTableBooking.create.mockResolvedValueOnce({ id: 'booking1' });

      const result = await service.createReservation(restaurantId, eventId, {
        guestName: 'Ali',
        guestPhone: '0770',
        partySize: 3,
        reservationDate: '2026-09-10',
      });

      expect(result).toEqual({ id: 'booking1' });
      expect(prisma.db.chefTableBooking.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('list', () => {
    it('excludes hidden events from the restaurant\'s own list', () => {
      service.list(restaurantId);

      expect(prisma.db.restaurantEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ moderationStatus: { not: 'HIDDEN' } }),
        }),
      );
    });
  });

  describe('admin moderation', () => {
    it('moderate() throws NotFoundException for a missing event', async () => {
      prisma.db.restaurantEvent.findUnique.mockResolvedValueOnce(null);

      await expect(service.moderate('missing', { status: 'HIDDEN' })).rejects.toThrow(NotFoundException);
      expect(prisma.db.restaurantEvent.update).not.toHaveBeenCalled();
    });

    it('moderate() updates the moderation status', async () => {
      prisma.db.restaurantEvent.findUnique.mockResolvedValueOnce({ id: eventId });
      prisma.db.restaurantEvent.update.mockResolvedValueOnce({ id: eventId, moderationStatus: 'HIDDEN' });

      await service.moderate(eventId, { status: 'HIDDEN' });

      expect(prisma.db.restaurantEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { moderationStatus: 'HIDDEN' } }),
      );
    });
  });
});
