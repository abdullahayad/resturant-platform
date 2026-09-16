import { Module } from '@nestjs/common';
import { RestaurantPreviewController } from './restaurant-preview.controller';
import { PreviewService } from './preview.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [RestaurantPreviewController],
  providers: [PreviewService],
})
export class PreviewModule {}
