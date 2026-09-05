import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import type { CreateEventDto, ModerateEventDto, UpdateEventDto } from './dto/event.dto';
import type { CreateReservationDto, UpdateReservationStatusDto } from './dto/reservation.dto';
import type { ModerationStatusValue } from '../common/moderation';
import { normalizePhone } from '../common/phone';

const eventSelect = {
  id: true,
  eventTypeId: true,
  titleEn: true,
  titleAr: true,
  descriptionEn: true,
  descriptionAr: true,
  photoUrl: true,
  price: true,
  capacity: true,
  isRecurring: true,
  eventDate: true,
  recurringDayOfWeek: true,
  recurringTime: true,
  isActive: true,
  moderationStatus: true,
  createdAt: true,
  eventType: { select: { id: true, nameEn: true, nameAr: true, icon: true } },
} as const;

const reservationSelect = {
  id: true,
  eventId: true,
  guestName: true,
  guestPhone: true,
  partySize: true,
  reservationDate: true,
  status: true,
  notes: true,
  createdAt: true,
  event: { select: { id: true, titleEn: true, titleAr: true, capacity: true } },
} as const;

// Non-cancelled reservations count against capacity.
const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED'] as const;

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly loyalty: LoyaltyService,
  ) {}

  list(restaurantId: string) {
    return this.prisma.db.restaurantEvent.findMany({
      where: { restaurantId, moderationStatus: { not: 'HIDDEN' } },
      select: eventSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Public: what a future customer-facing view would show — active events
  // only, one-off events that haven't already passed, soonest first.
  async publicList(restaurantId: string) {
    const events = await this.prisma.db.restaurantEvent.findMany({
      where: {
        restaurantId,
        isActive: true,
        moderationStatus: { not: 'HIDDEN' },
        OR: [{ isRecurring: true }, { isRecurring: false, eventDate: { gte: new Date() } }],
      },
      select: eventSelect,
    });

    const recurring = events.filter((e) => e.isRecurring).sort((a, b) => (a.recurringDayOfWeek ?? 0) - (b.recurringDayOfWeek ?? 0));
    const oneOff = events
      .filter((e) => !e.isRecurring)
      .sort((a, b) => (a.eventDate?.getTime() ?? 0) - (b.eventDate?.getTime() ?? 0));
    return [...oneOff, ...recurring];
  }

  create(restaurantId: string, dto: CreateEventDto) {
    return this.prisma.db.restaurantEvent.create({
      data: {
        restaurantId,
        eventTypeId: dto.eventTypeId,
        titleEn: dto.titleEn,
        titleAr: dto.titleAr,
        descriptionEn: dto.descriptionEn,
        descriptionAr: dto.descriptionAr,
        photoUrl: dto.photoUrl,
        price: dto.price,
        capacity: dto.capacity,
        isRecurring: dto.isRecurring,
        eventDate: dto.isRecurring ? null : dto.eventDate ? new Date(dto.eventDate) : null,
        recurringDayOfWeek: dto.isRecurring ? dto.recurringDayOfWeek : null,
        recurringTime: dto.isRecurring ? dto.recurringTime : null,
      },
      select: eventSelect,
    });
  }

  async update(restaurantId: string, id: string, dto: UpdateEventDto) {
    await this.ensureOwnership(restaurantId, id);
    return this.prisma.db.restaurantEvent.update({
      where: { id },
      data: {
        eventTypeId: dto.eventTypeId,
        titleEn: dto.titleEn,
        titleAr: dto.titleAr,
        descriptionEn: dto.descriptionEn,
        descriptionAr: dto.descriptionAr,
        photoUrl: dto.photoUrl,
        price: dto.price,
        capacity: dto.capacity,
        isActive: dto.isActive,
        ...(dto.isRecurring !== undefined
          ? {
              isRecurring: dto.isRecurring,
              eventDate: dto.isRecurring ? null : dto.eventDate ? new Date(dto.eventDate) : undefined,
              recurringDayOfWeek: dto.isRecurring ? dto.recurringDayOfWeek : null,
              recurringTime: dto.isRecurring ? dto.recurringTime : null,
            }
          : {
              eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
              recurringDayOfWeek: dto.recurringDayOfWeek,
              recurringTime: dto.recurringTime,
            }),
      },
      select: eventSelect,
    });
  }

  async remove(restaurantId: string, id: string) {
    await this.ensureOwnership(restaurantId, id);
    await this.prisma.db.restaurantEvent.delete({ where: { id } });
    return { id };
  }

  private async ensureOwnership(restaurantId: string, id: string) {
    const event = await this.prisma.db.restaurantEvent.findUnique({ where: { id } });
    if (!event || event.restaurantId !== restaurantId) throw new NotFoundException('Event not found');
  }

  // ── Reservations ──────────────────────────────────────────────────

  private dayBounds(dateStr: string) {
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  private async reservedCount(eventId: string, dateStr: string) {
    const { start, end } = this.dayBounds(dateStr);
    const reservations = await this.prisma.db.chefTableBooking.findMany({
      where: {
        eventId,
        status: { in: [...ACTIVE_STATUSES] },
        reservationDate: { gte: start, lt: end },
      },
      select: { partySize: true },
    });
    return reservations.reduce((sum, r) => sum + r.partySize, 0);
  }

  // A publicly bookable event must belong to an active restaurant that is
  // still APPROVED — mirrors reviews.service.ts's check for public writes.
  private async findBookableEvent(restaurantId: string, eventId: string) {
    const event = await this.prisma.db.restaurantEvent.findUnique({
      where: { id: eventId },
      include: { restaurant: { select: { status: true, notifyNewBooking: true } } },
    });
    if (
      !event ||
      event.restaurantId !== restaurantId ||
      !event.isActive ||
      event.restaurant.status !== 'APPROVED'
    ) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  // A reservationDate is only meaningful if it's an actual occurrence of the
  // event — otherwise a client could pick an arbitrary date to dodge the
  // capacity check on the real one.
  private assertValidOccurrence(event: { isRecurring: boolean; eventDate: Date | null; recurringDayOfWeek: number | null }, dateStr: string) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('reservationDate is not a valid date');
    }
    if (event.isRecurring) {
      if (date.getDay() !== event.recurringDayOfWeek) {
        throw new BadRequestException('reservationDate does not fall on this event\'s recurring day');
      }
    } else {
      const eventDay = event.eventDate ? this.dayBounds(event.eventDate.toISOString()).start.getTime() : null;
      const requestedDay = this.dayBounds(dateStr).start.getTime();
      if (eventDay == null || requestedDay !== eventDay) {
        throw new BadRequestException('reservationDate does not match this event\'s date');
      }
    }
  }

  async availability(restaurantId: string, eventId: string, dateStr: string) {
    const event = await this.findBookableEvent(restaurantId, eventId);
    this.assertValidOccurrence(event, dateStr);
    if (event.capacity == null) {
      return { capacity: null, reserved: 0, remaining: null };
    }
    const reserved = await this.reservedCount(eventId, dateStr);
    return { capacity: event.capacity, reserved, remaining: Math.max(0, event.capacity - reserved) };
  }

  async createReservation(restaurantId: string, eventId: string, dto: CreateReservationDto) {
    const event = await this.findBookableEvent(restaurantId, eventId);
    this.assertValidOccurrence(event, dto.reservationDate);

    const reservation = await this.prisma.db.$transaction(
      async (tx) => {
        if (event.capacity != null) {
          const { start, end } = this.dayBounds(dto.reservationDate);
          const existing = await tx.chefTableBooking.findMany({
            where: { eventId, status: { in: [...ACTIVE_STATUSES] }, reservationDate: { gte: start, lt: end } },
            select: { partySize: true },
          });
          const reserved = existing.reduce((sum, r) => sum + r.partySize, 0);
          if (reserved + dto.partySize > event.capacity) {
            throw new BadRequestException('This event is fully booked for that date');
          }
        }

        return tx.chefTableBooking.create({
          data: {
            restaurantId,
            eventId,
            guestName: dto.guestName,
            guestPhone: dto.guestPhone,
            guestPhoneNormalized: normalizePhone(dto.guestPhone),
            partySize: dto.partySize,
            reservationDate: new Date(dto.reservationDate),
            notes: dto.notes,
          },
          select: reservationSelect,
        });
      },
      { isolationLevel: 'Serializable' },
    );

    if (event.restaurant.notifyNewBooking) {
      this.push
        .sendToRestaurants(
          [restaurantId],
          'New reservation request',
          `${dto.guestName} · ${dto.partySize} guests · ${event.titleEn}`,
          { screen: 'reservations' },
        )
        .catch(() => {});
    }
    return reservation;
  }

  async listReservations(restaurantId: string) {
    const reservations = await this.prisma.db.chefTableBooking.findMany({
      where: { restaurantId },
      select: reservationSelect,
      orderBy: { reservationDate: 'asc' },
    });

    const phones = reservations.map((r) => normalizePhone(r.guestPhone));
    const tiersByPhone = await this.loyalty.currentTiersForPhones(phones);
    return reservations.map((r, i) => ({ ...r, guestTier: tiersByPhone.get(phones[i]) ?? null }));
  }

  async updateReservationStatus(restaurantId: string, id: string, dto: UpdateReservationStatusDto) {
    const booking = await this.prisma.db.chefTableBooking.findUnique({ where: { id } });
    if (!booking || booking.restaurantId !== restaurantId) throw new NotFoundException('Reservation not found');
    const updated = await this.prisma.db.chefTableBooking.update({
      where: { id },
      data: { status: dto.status },
      select: reservationSelect,
    });
    this.loyalty.maybeAutoIssue(booking.guestPhoneNormalized).catch(() => {});
    return updated;
  }

  // ── Admin moderation ─────────────────────────────────────────────────

  adminList(status?: ModerationStatusValue) {
    return this.prisma.db.restaurantEvent.findMany({
      where: { moderationStatus: status },
      select: { ...eventSelect, restaurant: { select: { id: true, nameEn: true, nameAr: true, codeNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async moderate(id: string, dto: ModerateEventDto) {
    const event = await this.prisma.db.restaurantEvent.findUnique({ where: { id }, select: { id: true } });
    if (!event) throw new NotFoundException('Event not found');
    return this.prisma.db.restaurantEvent.update({ where: { id }, data: { moderationStatus: dto.status }, select: eventSelect });
  }
}
