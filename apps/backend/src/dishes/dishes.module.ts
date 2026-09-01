import { Module } from '@nestjs/common';
import { DishesController } from './dishes.controller';
import { AdminDishesController } from './admin-dishes.controller';
import { DishesService } from './dishes.service';

@Module({
  controllers: [DishesController, AdminDishesController],
  providers: [DishesService],
})
export class DishesModule {}
