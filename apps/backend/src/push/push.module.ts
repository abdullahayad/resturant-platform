import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { CustomerNotificationsService } from './customer-notifications.service';

@Module({
  providers: [PushService, CustomerNotificationsService],
  exports: [PushService, CustomerNotificationsService],
})
export class PushModule {}
