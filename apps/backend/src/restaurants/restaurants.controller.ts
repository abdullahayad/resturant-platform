import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RegisterRestaurantDto } from './dto/register-restaurant.dto';
import { ListRestaurantsQuery, RejectRestaurantDto } from './dto/update-restaurant-status.dto';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Post()
  register(@Body() dto: RegisterRestaurantDto) {
    return this.restaurants.register(dto);
  }

  @Get()
  list(@Query() query: ListRestaurantsQuery) {
    return this.restaurants.list(query.status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurants.findOne(id);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.restaurants.approve(id);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectRestaurantDto) {
    return this.restaurants.reject(id, dto.reason);
  }

  @Patch(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.restaurants.suspend(id);
  }
}
