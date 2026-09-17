import { Module } from '@nestjs/common';
import { RestaurantPreviewController } from './restaurant-preview.controller';
import { PreviewService } from './preview.service';
import { EventsModule } from '../events/events.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [EventsModule, PromotionsModule],
  controllers: [RestaurantPreviewController],
  providers: [PreviewService],
})
export class PreviewModule {}
