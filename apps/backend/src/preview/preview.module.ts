import { Module } from '@nestjs/common';
import { RestaurantPreviewController } from './restaurant-preview.controller';
import { PublicRestaurantDataController, PublicRestaurantPageController } from './public-restaurant-page.controller';
import { PreviewService } from './preview.service';
import { EventsModule } from '../events/events.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { FeaturedModule } from '../featured/featured.module';

@Module({
  imports: [EventsModule, PromotionsModule, ReviewsModule, FeaturedModule],
  controllers: [RestaurantPreviewController, PublicRestaurantDataController, PublicRestaurantPageController],
  providers: [PreviewService],
})
export class PreviewModule {}
