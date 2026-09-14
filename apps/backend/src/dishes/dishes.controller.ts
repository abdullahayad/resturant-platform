import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DishesService } from './dishes.service';
import { CreateDishDto, UpdateDishDto } from './dto/dish.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import { PageQueryDto } from '../common/pagination';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@Controller('restaurants/me/dishes')
export class DishesController {
  constructor(private readonly dishes: DishesService) {}

  // Full, unpaginated list - kept exactly as it always was because other
  // screens (Photo Gallery's dish picker, Promotions' specific-dishes
  // picker) need every dish at once, not a page of them. Menu Management's
  // own browsing view uses browse() below instead.
  @UseGuards(PartnerAuthGuard)
  @Get()
  list(@Req() req: { user: PartnerJwtPayload }) {
    return this.dishes.list(req.user.sub);
  }

  @UseGuards(PartnerAuthGuard)
  @Get('browse')
  browse(@Req() req: { user: PartnerJwtPayload }, @Query() query: PageQueryDto) {
    return this.dishes.browse(req.user.sub, query.page);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Post()
  create(@Req() req: { user: PartnerJwtPayload }, @Body() dto: CreateDishDto) {
    return this.dishes.create(req.user.sub, dto);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Patch(':id')
  update(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string, @Body() dto: UpdateDishDto) {
    return this.dishes.update(req.user.sub, id, dto);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Delete(':id')
  remove(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.dishes.remove(req.user.sub, id);
  }
}
