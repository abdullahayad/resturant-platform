import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PushModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
