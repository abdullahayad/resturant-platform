import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { AvailabilityQueryDto, CreateReservationDto, UpdateReservationStatusDto } from './dto/reservation.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@Controller()
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @UseGuards(PartnerAuthGuard)
  @Get('restaurants/me/events')
  mine(@Req() req: { user: PartnerJwtPayload }) {
    return this.events.list(req.user.sub);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Post('restaurants/me/events')
  create(@Req() req: { user: PartnerJwtPayload }, @Body() dto: CreateEventDto) {
    return this.events.create(req.user.sub, dto);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Patch('restaurants/me/events/:id')
  update(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.events.update(req.user.sub, id, dto);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Delete('restaurants/me/events/:id')
  remove(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.events.remove(req.user.sub, id);
  }

  @UseGuards(PartnerAuthGuard)
  @Get('restaurants/me/reservations')
  myReservations(@Req() req: { user: PartnerJwtPayload }) {
    return this.events.listReservations(req.user.sub);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Patch('restaurants/me/reservations/:id')
  updateReservation(
    @Req() req: { user: PartnerJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateReservationStatusDto,
  ) {
    return this.events.updateReservationStatus(req.user.sub, id, dto);
  }

  // Public — for a future customer-facing app. No auth: anyone can see what
  // events an approved restaurant has coming up, check availability, and
  // submit a reservation request (guest name + phone, no account needed).
  @Get('restaurants/:id/events')
  publicList(@Param('id') id: string) {
    return this.events.publicList(id);
  }

  @Get('restaurants/:id/events/:eventId/availability')
  availability(@Param('id') id: string, @Param('eventId') eventId: string, @Query() query: AvailabilityQueryDto) {
    return this.events.availability(id, eventId, query.date);
  }

  // Tighter throttle than the app default — this is an unauthenticated
  // write with no other abuse protection (see security review).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('restaurants/:id/events/:eventId/reservations')
  reserve(@Param('id') id: string, @Param('eventId') eventId: string, @Body() dto: CreateReservationDto) {
    return this.events.createReservation(id, eventId, dto);
  }
}
