import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@UseGuards(PartnerAuthGuard)
@Controller('restaurants/me/announcements')
export class RestaurantAnnouncementsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() req: { user: PartnerJwtPayload }) {
    return this.notifications.listForRestaurant(req.user.sub);
  }

  @Patch(':id/read')
  markRead(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.notifications.markRead(req.user.sub, id);
  }

  @Patch(':id/acknowledge')
  markAcknowledged(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.notifications.markAcknowledged(req.user.sub, id);
  }
}
