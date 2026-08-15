import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { DishesService } from './dishes.service';
import { CreateDishDto, UpdateDishDto } from './dto/dish.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@UseGuards(PartnerAuthGuard)
@Controller('restaurants/me/dishes')
export class DishesController {
  constructor(private readonly dishes: DishesService) {}

  @Get()
  list(@Req() req: { user: PartnerJwtPayload }) {
    return this.dishes.list(req.user.sub);
  }

  @Post()
  create(@Req() req: { user: PartnerJwtPayload }, @Body() dto: CreateDishDto) {
    return this.dishes.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string, @Body() dto: UpdateDishDto) {
    return this.dishes.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.dishes.remove(req.user.sub, id);
  }
}
