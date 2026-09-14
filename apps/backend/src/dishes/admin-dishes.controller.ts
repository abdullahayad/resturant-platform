import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { DishesService } from './dishes.service';
import { ListDishesQuery, ModerateDishDto } from './dto/dish.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller('admin/dishes')
export class AdminDishesController {
  constructor(private readonly dishes: DishesService) {}

  @Get()
  list(@Query() query: ListDishesQuery) {
    return this.dishes.adminList(query.status, query.page);
  }

  @Patch(':id/moderate')
  moderate(@Param('id') id: string, @Body() dto: ModerateDishDto) {
    return this.dishes.moderate(id, dto);
  }
}
