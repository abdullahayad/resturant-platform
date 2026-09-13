import { Module } from '@nestjs/common';
import { RestaurantAnalyticsController } from './restaurant-analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [RestaurantAnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
