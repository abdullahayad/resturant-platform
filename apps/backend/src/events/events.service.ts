import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import type { CreateReservationDto, UpdateReservationStatusDto } from './dto/reservation.dto';

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
  constructor(private readonly prisma: PrismaService) {}

  list(restaurantId: string) {
    return this.prisma.db.restaurantEvent.findMany({
      where: { restaurantId },
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

  async availability(restaurantId: string, eventId: string, dateStr: string) {
    const event = await this.prisma.db.restaurantEvent.findUnique({ where: { id: eventId } });
    if (!event || event.restaurantId !== restaurantId || !event.isActive) {
      throw new NotFoundException('Event not found');
    }
    if (event.capacity == null) {
      return { capacity: null, reserved: 0, remaining: null };
    }
    const reserved = await this.reservedCount(eventId, dateStr);
    return { capacity: event.capacity, reserved, remaining: Math.max(0, event.capacity - reserved) };
  }

  async createReservation(restaurantId: string, eventId: string, dto: CreateReservationDto) {
    const event = await this.prisma.db.restaurantEvent.findUnique({ where: { id: eventId } });
    if (!event || event.restaurantId !== restaurantId || !event.isActive) {
      throw new NotFoundException('Event not found');
    }

    if (event.capacity != null) {
      const reserved = await this.reservedCount(eventId, dto.reservationDate);
      if (reserved + dto.partySize > event.capacity) {
        throw new BadRequestException('This event is fully booked for that date');
      }
    }

    return this.prisma.db.chefTableBooking.create({
      data: {
        restaurantId,
        eventId,
        guestName: dto.guestName,
        guestPhone: dto.guestPhone,
        partySize: dto.partySize,
        reservationDate: new Date(dto.reservationDate),
        notes: dto.notes,
      },
      select: reservationSelect,
    });
  }

  listReservations(restaurantId: string) {
    return this.prisma.db.chefTableBooking.findMany({
      where: { restaurantId },
      select: reservationSelect,
      orderBy: { reservationDate: 'asc' },
    });
  }

  async updateReservationStatus(restaurantId: string, id: string, dto: UpdateReservationStatusDto) {
    const booking = await this.prisma.db.chefTableBooking.findUnique({ where: { id } });
    if (!booking || booking.restaurantId !== restaurantId) throw new NotFoundException('Reservation not found');
    return this.prisma.db.chefTableBooking.update({
      where: { id },
      data: { status: dto.status },
      select: reservationSelect,
    });
  }
}
