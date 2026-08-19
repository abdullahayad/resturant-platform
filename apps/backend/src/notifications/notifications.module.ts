import { Module } from '@nestjs/common';
import { AdminNotificationsController } from './admin-notifications.controller';
import { RestaurantAnnouncementsController } from './restaurant-announcements.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [AdminNotificationsController, RestaurantAnnouncementsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
