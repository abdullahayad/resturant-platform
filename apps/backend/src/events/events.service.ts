import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateEventDto, UpdateEventDto } from './dto/event.dto';

const eventSelect = {
  id: true,
  eventTypeId: true,
  titleEn: true,
  titleAr: true,
  descriptionEn: true,
  descriptionAr: true,
  photoUrl: true,
  price: true,
  isRecurring: true,
  eventDate: true,
  recurringDayOfWeek: true,
  recurringTime: true,
  isActive: true,
  createdAt: true,
  eventType: { select: { id: true, nameEn: true, nameAr: true, icon: true } },
} as const;

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
}
