import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/notification.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import type { AdminJwtPayload } from '../auth/jwt-payload';

@UseGuards(AdminAuthGuard)
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  create(@Req() req: { user: AdminJwtPayload }, @Body() dto: CreateNotificationDto) {
    return this.notifications.create(req.user.sub, dto);
  }

  @Get()
  list() {
    return this.notifications.list();
  }

  @Get(':id/recipients')
  recipients(@Param('id') id: string) {
    return this.notifications.recipients(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notifications.remove(id);
  }
}
