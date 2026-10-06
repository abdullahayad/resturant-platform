import { Module } from '@nestjs/common';
import { RestaurantFeaturedController } from './restaurant-featured.controller';
import { AdminFeaturedController } from './admin-featured.controller';
import { FeaturedService } from './featured.service';

@Module({
  controllers: [RestaurantFeaturedController, AdminFeaturedController],
  providers: [FeaturedService],
  exports: [FeaturedService],
})
export class FeaturedModule {}
