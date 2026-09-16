import { Module } from '@nestjs/common';
import { RestaurantActivityController } from './restaurant-activity.controller';
import { ActivityService } from './activity.service';

@Module({
  controllers: [RestaurantActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
