import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';

type Named = { nameEn: string; nameAr: string };

// The customer-app notifications other parts of the backend trigger. All
// fire-and-forget: callers don't await them, and a failure only logs.
// \`data.screen\` tells the app what to open when the notification is tapped.
@Injectable()
export class CustomerNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  // The restaurant confirmed or cancelled a booking. Bookings are tied to a
  // phone number, so it reaches the account with that (verified) number.
  async bookingStatusChanged(booking: {
    guestPhoneNormalized: string;
    status: string;
    eventTitleEn: string;
    eventTitleAr: string;
    restaurant: Named;
  }) {
    if (booking.status !== 'CONFIRMED' && booking.status !== 'CANCELLED') return;
    const customer = await this.prisma.db.customer.findUnique({
      where: { phone: booking.guestPhoneNormalized },
      select: { id: true, blockedAt: true },
    });
    if (!customer || customer.blockedAt) return;
    const confirmed = booking.status === 'CONFIRMED';
    await this.push.sendToCustomers(
      [customer.id],
      {
        titleEn: confirmed ? 'Booking confirmed ✅' : 'Booking cancelled',
        titleAr: confirmed ? 'تم تأكيد حجزك ✅' : 'انلغى حجزك',
        bodyEn: `${booking.eventTitleEn} · ${booking.restaurant.nameEn}`,
        bodyAr: `${booking.eventTitleAr} · ${booking.restaurant.nameAr}`,
      },
      { screen: 'bookings' },
    );
  }

  async supportReplied(customerId: string) {
    await this.push.sendToCustomers(
      [customerId],
      {
        titleEn: 'LiGETA replied',
        titleAr: 'ليكيته ردّت عليك',
        bodyEn: 'Open Help to read the reply.',
        bodyAr: 'افتح المساعدة حتى تقرأ الرد.',
      },
      { screen: 'help' },
    );
  }

  // A restaurant the customer follows posted a new offer or event - only
  // for followers who keep "news from places I follow" on, and only while
  // the restaurant is live.
  async followedRestaurantNews(restaurantId: string, kind: 'offer' | 'event', titleEn: string, titleAr: string) {
    const restaurant = await this.prisma.db.restaurant.findFirst({
      where: { id: restaurantId, status: 'APPROVED', publishStatus: 'APPROVED' },
      select: { nameEn: true, nameAr: true },
    });
    if (!restaurant) return;
    const followers = await this.prisma.db.customerFollow.findMany({
      where: { restaurantId, customer: { notifyFollowing: true, blockedAt: null } },
      select: { customerId: true },
    });
    await this.push.sendToCustomers(
      followers.map((f) => f.customerId),
      {
        titleEn: kind === 'offer' ? `New offer at ${restaurant.nameEn}` : `New event at ${restaurant.nameEn}`,
        titleAr: kind === 'offer' ? `عرض جديد عند ${restaurant.nameAr}` : `فعالية جديدة عند ${restaurant.nameAr}`,
        bodyEn: titleEn,
        bodyAr: titleAr,
      },
      { screen: 'restaurant', id: restaurantId },
    );
  }

  // A critic the customer follows wrote a new review.
  async criticReviewed(criticId: string, criticName: string, restaurantId: string, restaurant: Named, rating: number) {
    const followers = await this.prisma.db.criticFollow.findMany({
      where: { criticId, follower: { notifyFollowing: true, blockedAt: null } },
      select: { followerId: true },
    });
    const stars = '★'.repeat(rating);
    await this.push.sendToCustomers(
      followers.map((f) => f.followerId),
      {
        titleEn: `${criticName} reviewed ${restaurant.nameEn}`,
        titleAr: `${criticName} قيّم ${restaurant.nameAr}`,
        bodyEn: stars,
        bodyAr: stars,
      },
      { screen: 'restaurant', id: restaurantId },
    );
  }
}
