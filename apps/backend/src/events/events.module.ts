import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { AdminEventsController } from './admin-events.controller';
import { EventsService } from './events.service';
import { PushModule } from '../push/push.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [PushModule, LoyaltyModule],
  controllers: [EventsController, AdminEventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
