import { Module } from '@nestjs/common';
import { RestaurantFeatureFlagsController } from './restaurant-feature-flags.controller';
import { AdminFeatureFlagsController } from './admin-feature-flags.controller';
import { FeatureFlagsService } from './feature-flags.service';

@Module({
  controllers: [RestaurantFeatureFlagsController, AdminFeatureFlagsController],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
