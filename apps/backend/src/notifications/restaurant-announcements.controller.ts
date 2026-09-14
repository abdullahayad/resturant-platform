import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ReplyToAnnouncementDto } from './dto/notification.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { PageQueryDto } from '../common/pagination';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@UseGuards(PartnerAuthGuard)
@Controller('restaurants/me/announcements')
export class RestaurantAnnouncementsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() req: { user: PartnerJwtPayload }, @Query() query: PageQueryDto) {
    return this.notifications.listForRestaurant(req.user.sub, query.page);
  }

  // Lightweight count for the sidebar's "unread announcements" badge - see
  // the equivalent reservations/promotions counts for why this exists as
  // its own endpoint instead of reusing the (now paginated) list above.
  @Get('unread-count')
  unreadCount(@Req() req: { user: PartnerJwtPayload }) {
    return this.notifications.unreadCount(req.user.sub);
  }

  @Patch(':id/read')
  markRead(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.notifications.markRead(req.user.sub, id);
  }

  @Patch(':id/acknowledge')
  markAcknowledged(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.notifications.markAcknowledged(req.user.sub, id);
  }

  @Patch(':id/reply')
  reply(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string, @Body() dto: ReplyToAnnouncementDto) {
    return this.notifications.reply(req.user.sub, id, dto.text);
  }
}
