import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { CustomerNotificationsService } from '../push/customer-notifications.service';
import { isCritic } from './customer-levels';
import { ReviewsService } from '../reviews/reviews.service';
import { pageOffset } from '../common/pagination';
import type { CreateReviewDto } from '../reviews/dto/review.dto';

// What a customer wrote shows under this name when they never set one.
const FALLBACK_REVIEWER_NAME = 'LiGETA';

const restaurantMini = { select: { id: true, nameEn: true, nameAr: true, logoUrl: true } } as const;

// A signed-in customer's own reviews and event bookings.
@Injectable()
export class CustomerActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviews: ReviewsService,
    private readonly push: PushService,
    private readonly customerNotifications: CustomerNotificationsService,
  ) {}

  // Same path as the public review page (same 12-hour limit per phone, same
  // moderation and restaurant notification), with the customer's name and
  // verified number filled in from their account.
  async writeReview(
    customerId: string,
    restaurantId: string,
    dto: Omit<CreateReviewDto, 'reviewerName' | 'reviewerPhone'>,
  ) {
    const customer = await this.prisma.db.customer.findUnique({
      where: { id: customerId },
      select: {
        name: true,
        phone: true,
        isPublic: true,
        criticHidden: true,
        isStar: true,
        blockedAt: true,
        _count: { select: { visits: true } },
      },
    });
    if (!customer) throw new NotFoundException('Account not found');
    const reviewerName = customer.name ?? FALLBACK_REVIEWER_NAME;
    const review = await this.reviews.createForRestaurant(
      restaurantId,
      { ...dto, reviewerName, reviewerPhone: customer.phone },
      customerId,
    );
    // A critic's followers hear about their new review.
    if (isCritic(customer, customer._count.visits)) {
      this.prisma.db.restaurant
        .findUnique({ where: { id: restaurantId }, select: { nameEn: true, nameAr: true } })
        .then(
          (r) => r && this.customerNotifications.criticReviewed(customerId, reviewerName, restaurantId, r, dto.rating),
        )
        .catch(() => {});
    }
    return review;
  }

  async myReviews(customerId: string, pageParam?: number) {
    const { page, skip, take } = pageOffset(pageParam);
    const where = { customerId };
    const [items, total] = await Promise.all([
      this.prisma.db.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          rating: true,
          text: true,
          createdAt: true,
          moderationStatus: true,
          reply: { select: { text: true } },
          restaurant: restaurantMini,
        },
      }),
      this.prisma.db.review.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  // Event bookings made with the customer's number - signing in with the
  // WhatsApp code proves they own it, so bookings made before they had an
  // account show up too.
  async myBookings(customerId: string, pageParam?: number) {
    const phone = await this.phoneOf(customerId);
    const { page, skip, take } = pageOffset(pageParam);
    const where = { guestPhoneNormalized: phone };
    const [items, total] = await Promise.all([
      this.prisma.db.chefTableBooking.findMany({
        where,
        orderBy: { reservationDate: 'desc' },
        skip,
        take,
        select: {
          id: true,
          partySize: true,
          reservationDate: true,
          status: true,
          notes: true,
          createdAt: true,
          event: {
            select: {
              id: true,
              titleEn: true,
              titleAr: true,
              photoUrl: true,
              price: true,
              isRecurring: true,
              recurringTime: true,
              eventType: { select: { nameEn: true, nameAr: true, icon: true } },
            },
          },
          restaurant: restaurantMini,
        },
      }),
      this.prisma.db.chefTableBooking.count({ where }),
    ]);
    return {
      items: items.map((b) => ({
        ...b,
        event: { ...b.event, price: b.event.price != null ? Number(b.event.price) : null },
      })),
      total,
      page,
      pageSize: take,
    };
  }

  // The customer can cancel a booking that hasn't happened yet; the
  // restaurant gets a push so it can free the seats.
  async cancelBooking(customerId: string, bookingId: string, now = new Date()) {
    const phone = await this.phoneOf(customerId);
    const booking = await this.prisma.db.chefTableBooking.findUnique({
      where: { id: bookingId },
      select: {
        guestPhoneNormalized: true,
        guestName: true,
        partySize: true,
        status: true,
        reservationDate: true,
        restaurantId: true,
        event: { select: { titleEn: true } },
        restaurant: { select: { notifyNewBooking: true } },
      },
    });
    if (!booking || booking.guestPhoneNormalized !== phone) throw new NotFoundException('Booking not found');
    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      throw new BadRequestException('This booking can no longer be cancelled');
    }
    // A booking date is a calendar day (midnight) for recurring events, so
    // allow cancelling until the end of that day.
    if (booking.reservationDate.getTime() + 24 * 60 * 60 * 1000 < now.getTime()) {
      throw new BadRequestException('This booking has already passed');
    }
    await this.prisma.db.chefTableBooking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } });
    if (booking.restaurant.notifyNewBooking) {
      this.push
        .sendToRestaurants(
          [booking.restaurantId],
          'Reservation cancelled',
          `${booking.guestName} · ${booking.partySize} guests · ${booking.event.titleEn}`,
          { screen: 'reservations' },
        )
        .catch(() => {});
    }
    return { id: bookingId, status: 'CANCELLED' as const };
  }

  // The notifications inbox, newest first.
  async notifications(customerId: string, pageParam?: number) {
    const { page, skip, take } = pageOffset(pageParam);
    const where = { customerId };
    const [items, total] = await Promise.all([
      this.prisma.db.customerNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          titleEn: true,
          titleAr: true,
          bodyEn: true,
          bodyAr: true,
          data: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.db.customerNotification.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  async unreadNotifications(customerId: string) {
    const count = await this.prisma.db.customerNotification.count({ where: { customerId, readAt: null } });
    return { count };
  }

  async markNotificationsRead(customerId: string) {
    await this.prisma.db.customerNotification.updateMany({
      where: { customerId, readAt: null },
      data: { readAt: new Date() },
    });
    return { count: 0 };
  }

  private async phoneOf(customerId: string): Promise<string> {
    const customer = await this.prisma.db.customer.findUnique({ where: { id: customerId }, select: { phone: true } });
    if (!customer) throw new NotFoundException('Account not found');
    return customer.phone;
  }
}
