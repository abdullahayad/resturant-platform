import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { ListEventsQuery, ModerateEventDto } from './dto/event.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller('admin/events')
export class AdminEventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@Query() query: ListEventsQuery) {
    return this.events.adminList(query.status);
  }

  @Patch(':id/moderate')
  moderate(@Param('id') id: string, @Body() dto: ModerateEventDto) {
    return this.events.moderate(id, dto);
  }
}
