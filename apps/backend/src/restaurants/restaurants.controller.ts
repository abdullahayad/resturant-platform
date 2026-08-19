import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RegisterRestaurantDto } from './dto/register-restaurant.dto';
import { ListRestaurantsQuery, RejectRestaurantDto } from './dto/update-restaurant-status.dto';
import { UpdateRestaurantProfileDto } from './dto/update-restaurant-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateNotificationPrefsDto } from './dto/notification-prefs.dto';
import { UpdateOpeningHoursDto } from './dto/opening-hours.dto';
import { UpdateStatsVisibilityDto } from './dto/update-stats-visibility.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
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

  @UseGuards(ApprovedPartnerGuard)
  @Patch('me')
  updateMe(@Req() req: { user: PartnerJwtPayload }, @Body() dto: UpdateRestaurantProfileDto) {
    return this.restaurants.updateProfile(req.user.sub, dto);
  }

  @UseGuards(PartnerAuthGuard)
  @Patch('me/password')
  changePassword(@Req() req: { user: PartnerJwtPayload }, @Body() dto: ChangePasswordDto) {
    return this.restaurants.changePassword(req.user.sub, dto);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Patch('me/notifications')
  updateNotifications(@Req() req: { user: PartnerJwtPayload }, @Body() dto: UpdateNotificationPrefsDto) {
    return this.restaurants.updateNotificationPrefs(req.user.sub, dto);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Patch('me/hours')
  updateHours(@Req() req: { user: PartnerJwtPayload }, @Body() dto: UpdateOpeningHoursDto) {
    return this.restaurants.updateOpeningHours(req.user.sub, dto.days);
  }

  @UseGuards(AdminAuthGuard)
  @Get()
  list(@Query() query: ListRestaurantsQuery) {
    return this.restaurants.list(query);
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

  @UseGuards(AdminAuthGuard)
  @Patch(':id/stats-visibility')
  setStatsVisibility(@Param('id') id: string, @Body() dto: UpdateStatsVisibilityDto) {
    return this.restaurants.setStatsVisibility(id, dto.statsVisible);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  adminUpdate(@Param('id') id: string, @Body() dto: UpdateRestaurantProfileDto) {
    return this.restaurants.updateProfile(id, dto);
  }
}
