import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CustomerActivityService } from './customer-activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { ReviewsService } from '../reviews/reviews.service';

describe('CustomerActivityService', () => {
  let service: CustomerActivityService;
  let prisma: {
    db: {
      customer: { findUnique: jest.Mock };
      chefTableBooking: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    };
  };
  let reviews: { createForRestaurant: jest.Mock };
  let push: { sendToRestaurants: jest.Mock };
  const now = new Date('2026-11-03T12:00:00Z');

  const booking = (overrides: object = {}) => ({
    guestPhoneNormalized: '07701234567',
    guestName: 'Ali',
    partySize: 2,
    status: 'PENDING',
    reservationDate: new Date('2026-11-05T00:00:00Z'),
    restaurantId: 'rest-1',
    event: { titleEn: 'Buffet' },
    restaurant: { notifyNewBooking: true },
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      db: {
        customer: { findUnique: jest.fn().mockResolvedValue({ name: null, phone: '07701234567' }) },
        chefTableBooking: {
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      },
    };
    reviews = { createForRestaurant: jest.fn().mockResolvedValue({ id: 'rev-1' }) };
    push = { sendToRestaurants: jest.fn().mockResolvedValue(undefined) };
    const module = await Test.createTestingModule({
      providers: [
        CustomerActivityService,
        { provide: PrismaService, useValue: prisma },
        { provide: ReviewsService, useValue: reviews },
        { provide: PushService, useValue: push },
      ],
    }).compile();
    service = module.get(CustomerActivityService);
  });

  it("writes a review with the account's verified number, linked to the customer", async () => {
    await service.writeReview('cust-1', 'rest-1', { rating: 5, text: 'Great' });

    expect(reviews.createForRestaurant).toHaveBeenCalledWith(
      'rest-1',
      { rating: 5, text: 'Great', reviewerName: 'LiGETA', reviewerPhone: '07701234567' },
      'cust-1',
    );
  });

  it("lists only bookings made with the customer's own number", async () => {
    await service.myBookings('cust-1', 1);
    const [{ where }] = prisma.db.chefTableBooking.findMany.mock.calls[0] as [{ where: object }];
    expect(where).toEqual({ guestPhoneNormalized: '07701234567' });
  });

  it('cancels an upcoming booking and tells the restaurant', async () => {
    prisma.db.chefTableBooking.findUnique.mockResolvedValueOnce(booking());

    await expect(service.cancelBooking('cust-1', 'b1', now)).resolves.toEqual({ id: 'b1', status: 'CANCELLED' });
    expect(prisma.db.chefTableBooking.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { status: 'CANCELLED' },
    });
    expect(push.sendToRestaurants).toHaveBeenCalled();
  });

  it("refuses someone else's booking, a finished one, or one that already happened", async () => {
    prisma.db.chefTableBooking.findUnique.mockResolvedValueOnce(booking({ guestPhoneNormalized: '07800000000' }));
    await expect(service.cancelBooking('cust-1', 'b1', now)).rejects.toThrow(NotFoundException);

    prisma.db.chefTableBooking.findUnique.mockResolvedValueOnce(booking({ status: 'COMPLETED' }));
    await expect(service.cancelBooking('cust-1', 'b1', now)).rejects.toThrow(BadRequestException);

    prisma.db.chefTableBooking.findUnique.mockResolvedValueOnce(
      booking({ reservationDate: new Date('2026-11-01T00:00:00Z') }),
    );
    await expect(service.cancelBooking('cust-1', 'b1', now)).rejects.toThrow(BadRequestException);

    expect(prisma.db.chefTableBooking.update).not.toHaveBeenCalled();
  });
});
