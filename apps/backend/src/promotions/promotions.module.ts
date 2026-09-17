import { Module } from '@nestjs/common';
import { RestaurantPromotionsController } from './restaurant-promotions.controller';
import { AdminPromotionsController } from './admin-promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  controllers: [RestaurantPromotionsController, AdminPromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
