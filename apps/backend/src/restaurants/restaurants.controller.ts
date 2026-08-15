import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RegisterRestaurantDto } from './dto/register-restaurant.dto';
import { ListRestaurantsQuery, RejectRestaurantDto } from './dto/update-restaurant-status.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Post()
  register(@Body() dto: RegisterRestaurantDto) {
    return this.restaurants.register(dto);
  }

  @UseGuards(PartnerAuthGuard)
  @Get('me')
  me(@Req() req: { user: PartnerJwtPayload }) {
    return this.restaurants.findOne(req.user.sub);
  }

  @UseGuards(AdminAuthGuard)
  @Get()
  list(@Query() query: ListRestaurantsQuery) {
    return this.restaurants.list(query.status);
  }

  @UseGuards(AdminAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurants.findOne(id);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.restaurants.approve(id);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectRestaurantDto) {
    return this.restaurants.reject(id, dto.reason);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.restaurants.suspend(id);
  }
}
