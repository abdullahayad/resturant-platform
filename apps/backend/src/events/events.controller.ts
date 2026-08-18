import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@Controller()
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @UseGuards(PartnerAuthGuard)
  @Get('restaurants/me/events')
  mine(@Req() req: { user: PartnerJwtPayload }) {
    return this.events.list(req.user.sub);
  }

  @UseGuards(PartnerAuthGuard)
  @Post('restaurants/me/events')
  create(@Req() req: { user: PartnerJwtPayload }, @Body() dto: CreateEventDto) {
    return this.events.create(req.user.sub, dto);
  }

  @UseGuards(PartnerAuthGuard)
  @Patch('restaurants/me/events/:id')
  update(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.events.update(req.user.sub, id, dto);
  }

  @UseGuards(PartnerAuthGuard)
  @Delete('restaurants/me/events/:id')
  remove(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.events.remove(req.user.sub, id);
  }

  // Public — for a future customer-facing app. No auth: anyone can see what
  // events an approved restaurant has coming up.
  @Get('restaurants/:id/events')
  publicList(@Param('id') id: string) {
    return this.events.publicList(id);
  }
}
