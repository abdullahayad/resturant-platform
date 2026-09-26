import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import type { CreateEventDto, ModerateEventDto, UpdateEventDto } from './dto/event.dto';
import type { CreateReservationDto, UpdateReservationStatusDto } from './dto/reservation.dto';
import type { ModerationStatusValue } from '../common/moderation';
import { normalizePhone } from '../common/phone';
import { pageOffset } from '../common/pagination';
import { Prisma } from '../../generated/prisma/client';

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
  recurringDaysOfWeek: true,
  recurringTime: true,
  isActive: true,
  moderationStatus: true,
  createdAt: true,
  eventType: { select: { id: true, nameEn: true, nameAr: true, icon: true } },
} as const;

const reservationSelect = {
  id: true,
  restaurantId: true,
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

  async list(restaurantId: string) {
    const events = await this.prisma.db.restaurantEvent.findMany({
      where: { restaurantId, moderationStatus: { not: 'HIDDEN' } },
      select: eventSelect,
      orderBy: { createdAt: 'desc' },
    });

    // Live capacity, only for events that actually have a capacity set - a
    // recurring event's capacity resets every occurrence (a Friday-night
    // event isn't "full forever" once 12 people have ever booked it across
    // every week), so this counts against the next upcoming occurrence
    // specifically, not an all-time total that would never reset.
    return Promise.all(
      events.map(async (event) => {
        if (event.capacity == null) return { ...event, bookedCount: null, capacityDate: null };
        const capacityDate = this.nextOccurrenceDate(event);
        const bookedCount = capacityDate ? await this.reservedCount(event.id, capacityDate) : null;
        return { ...event, bookedCount, capacityDate };
      }),
    );
  }

  // The date live capacity is measured against: a one-off event's own date,
  // or the SOONEST upcoming date matching any of a recurring event's days
  // (today counts if today is one of them, so a same-day capacity badge
  // still reflects today's bookings rather than jumping ahead to next week).
  private nextOccurrenceDate(event: { isRecurring: boolean; eventDate: Date | null; recurringDaysOfWeek: number[] }): string | null {
    if (!event.isRecurring) {
      return event.eventDate ? event.eventDate.toISOString() : null;
    }
    if (event.recurringDaysOfWeek.length === 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDiff = Math.min(...event.recurringDaysOfWeek.map((day) => (day - today.getDay() + 7) % 7));
    const next = new Date(today);
    next.setDate(today.getDate() + minDiff);
    return next.toISOString();
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

    const earliestDay = (e: { recurringDaysOfWeek: number[] }) => (e.recurringDaysOfWeek.length ? Math.min(...e.recurringDaysOfWeek) : 0);
    const recurring = events.filter((e) => e.isRecurring).sort((a, b) => earliestDay(a) - earliestDay(b));
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
        recurringDaysOfWeek: dto.isRecurring ? dto.recurringDaysOfWeek : [],
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
              recurringDaysOfWeek: dto.isRecurring ? dto.recurringDaysOfWeek : [],
              recurringTime: dto.isRecurring ? dto.recurringTime : null,
            }
          : {
              eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
              recurringDaysOfWeek: dto.recurringDaysOfWeek,
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
  private assertValidOccurrence(event: { isRecurring: boolean; eventDate: Date | null; recurringDaysOfWeek: number[] }, dateStr: string) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('reservationDate is not a valid date');
    }
    if (event.isRecurring) {
      if (!event.recurringDaysOfWeek.includes(date.getDay())) {
        throw new BadRequestException('reservationDate does not fall on any of this event\'s recurring days');
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
    // Idempotency: a resubmission of the same booking attempt (e.g. a
    // customer double-tapping "Book" after the app looked like it hung)
    // reuses the same key, so this hands back the original booking instead
    // of creating - and re-notifying the restaurant about - a duplicate.
    // Checked first, before even looking up the event, since a
    // resubmission needs none of that. idempotencyKey is globally unique
    // (not scoped to restaurant/event), so a genuine resubmission must also
    // match the restaurant and event being booked here - otherwise this is
    // some other booking's key being reused by mistake, not a resubmission,
    // and returning that unrelated booking would be silently wrong.
    const alreadyBooked = await this.prisma.db.chefTableBooking.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      select: reservationSelect,
    });
    if (alreadyBooked) {
      if (alreadyBooked.restaurantId === restaurantId && alreadyBooked.eventId === eventId) {
        return alreadyBooked;
      }
      throw new BadRequestException('This idempotency key was already used for a different reservation');
    }

    const event = await this.findBookableEvent(restaurantId, eventId);
    this.assertValidOccurrence(event, dto.reservationDate);

    let reservation;
    try {
      reservation = await this.prisma.db.$transaction(
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
              idempotencyKey: dto.idempotencyKey,
            },
            select: reservationSelect,
          });
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (err) {
      // Two near-simultaneous requests carrying the *same* key (a real
      // double-tap firing two parallel requests, not a sequential retry)
      // can both pass the check above and race to insert - the unique
      // constraint lets exactly one win, and the loser hands back the
      // winner's row instead of surfacing a raw database error.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const winner = await this.prisma.db.chefTableBooking.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
          select: reservationSelect,
        });
        if (winner) return winner;
      }
      throw err;
    }

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

  async pendingReservationsCount(restaurantId: string) {
    const count = await this.prisma.db.chefTableBooking.count({ where: { restaurantId, status: 'PENDING' } });
    return { count };
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

  async adminList(status?: ModerationStatusValue, pageParam?: number, search?: string, sort?: 'createdAt' | 'reservationCount') {
    const s = search?.trim();
    const where: Prisma.RestaurantEventWhereInput = {
      moderationStatus: status,
      OR: s
        ? [
            { titleEn: { contains: s, mode: 'insensitive' } },
            { titleAr: { contains: s, mode: 'insensitive' } },
            { restaurant: { nameEn: { contains: s, mode: 'insensitive' } } },
            { restaurant: { codeNumber: { contains: s, mode: 'insensitive' } } },
          ]
        : undefined,
    };
    const { page, skip, take } = pageOffset(pageParam);
    // Note: this orderBy counts ALL reservations regardless of status —
    // Prisma's relation-count ordering can't apply the same active-statuses
    // filter the _count select below does, so "busiest first" is close to
    // but not exactly "most active reservations first" once paginated.
    const orderBy: Prisma.RestaurantEventOrderByWithRelationInput[] =
      sort === 'reservationCount' ? [{ reservations: { _count: 'desc' } }, { createdAt: 'desc' }] : [{ createdAt: 'desc' }];

    const [items, total] = await Promise.all([
      this.prisma.db.restaurantEvent.findMany({
        where,
        select: {
          ...eventSelect,
          restaurant: { select: { id: true, nameEn: true, nameAr: true, codeNumber: true } },
          // Only active-statused bookings count as "real" demand — a cancelled
          // request shouldn't inflate what admin sees as a busy event.
          _count: { select: { reservations: { where: { status: { in: [...ACTIVE_STATUSES] } } } } },
        },
        orderBy,
        skip,
        take,
      }),
      this.prisma.db.restaurantEvent.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  async adminEventReservations(eventId: string) {
    const event = await this.prisma.db.restaurantEvent.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) throw new NotFoundException('Event not found');
    return this.prisma.db.chefTableBooking.findMany({
      where: { eventId },
      select: reservationSelect,
      orderBy: { reservationDate: 'asc' },
    });
  }

  async moderate(id: string, dto: ModerateEventDto) {
    const event = await this.prisma.db.restaurantEvent.findUnique({ where: { id }, select: { id: true } });
    if (!event) throw new NotFoundException('Event not found');
    return this.prisma.db.restaurantEvent.update({ where: { id }, data: { moderationStatus: dto.status }, select: eventSelect });
  }
}
