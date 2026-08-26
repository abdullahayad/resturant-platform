import { Module } from '@nestjs/common';
import { AdminNotificationsController } from './admin-notifications.controller';
import { RestaurantAnnouncementsController } from './restaurant-announcements.controller';
import { NotificationsService } from './notifications.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PushModule],
  controllers: [AdminNotificationsController, RestaurantAnnouncementsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
