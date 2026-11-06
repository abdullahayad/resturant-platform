import { Module } from '@nestjs/common';
import { RestaurantPromotionsController } from './restaurant-promotions.controller';
import { AdminPromotionsController } from './admin-promotions.controller';
import { PromotionsService } from './promotions.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PushModule],
  controllers: [RestaurantPromotionsController, AdminPromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
