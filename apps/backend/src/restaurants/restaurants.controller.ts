import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RestaurantsService } from './restaurants.service';
import { RegisterRestaurantDto } from './dto/register-restaurant.dto';
import { ListRestaurantsQuery, ModeratePublishDto, RejectRestaurantDto } from './dto/update-restaurant-status.dto';
import { UpdateRestaurantProfileDto } from './dto/update-restaurant-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateNotificationPrefsDto } from './dto/notification-prefs.dto';
import { RegisterPushTokenDto } from './dto/push-token.dto';
import { UpdateOpeningHoursDto } from './dto/opening-hours.dto';
import { UpdateStatsVisibilityDto } from './dto/update-stats-visibility.dto';
import { SetChainDto } from './dto/set-chain.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import { ManagerOrOwnerGuard } from '../auth/guards/manager-or-owner.guard';
import type { AdminJwtPayload, PartnerJwtPayload } from '../auth/jwt-payload';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Post()
  register(@Body() dto: RegisterRestaurantDto) {
    return this.restaurants.register(dto);
  }

  // Public, unauthenticated — tightly throttled since both let an anonymous
  // caller trigger side effects (an email send, a password change) keyed
  // only on an email address they don't have to prove they own up front.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.restaurants.forgotPassword(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.restaurants.resetPassword(dto);
  }

  @UseGuards(PartnerAuthGuard)
  @Get('me')
  me(@Req() req: { user: PartnerJwtPayload }) {
    return this.restaurants.findOne(req.user.sub);
  }

  @UseGuards(ApprovedPartnerGuard, ManagerOrOwnerGuard)
  @Patch('me')
  updateMe(@Req() req: { user: PartnerJwtPayload }, @Body() dto: UpdateRestaurantProfileDto) {
    return this.restaurants.updateProfile(req.user.sub, dto);
  }

  @UseGuards(PartnerAuthGuard)
  @Patch('me/password')
  changePassword(@Req() req: { user: PartnerJwtPayload }, @Body() dto: ChangePasswordDto) {
    return this.restaurants.changePassword(req.user, dto);
  }

  @UseGuards(ApprovedPartnerGuard, ManagerOrOwnerGuard)
  @Patch('me/notifications')
  updateNotifications(@Req() req: { user: PartnerJwtPayload }, @Body() dto: UpdateNotificationPrefsDto) {
    return this.restaurants.updateNotificationPrefs(req.user.sub, dto);
  }

  @UseGuards(ApprovedPartnerGuard, ManagerOrOwnerGuard)
  @Patch('me/hours')
  updateHours(@Req() req: { user: PartnerJwtPayload }, @Body() dto: UpdateOpeningHoursDto) {
    return this.restaurants.updateOpeningHours(req.user.sub, dto.days);
  }

  @UseGuards(ApprovedPartnerGuard, ManagerOrOwnerGuard)
  @Post('me/publish-submit')
  submitForPublish(@Req() req: { user: PartnerJwtPayload }) {
    return this.restaurants.submitForPublish(req.user.sub);
  }

  @UseGuards(ApprovedPartnerGuard, ManagerOrOwnerGuard)
  @Patch('me/publish-acknowledge')
  acknowledgePublishDecline(@Req() req: { user: PartnerJwtPayload }) {
    return this.restaurants.acknowledgePublishDecline(req.user.sub);
  }

  // Any logged-in device (manager or staff, any role) can register/unregister
  // itself for push — this is per-device, not a profile-editing action.
  @UseGuards(PartnerAuthGuard)
  @Post('me/push-token')
  registerPushToken(@Req() req: { user: PartnerJwtPayload }, @Body() dto: RegisterPushTokenDto) {
    return this.restaurants.registerPushToken(req.user.sub, dto.token);
  }

  @UseGuards(PartnerAuthGuard)
  @Delete('me/push-token')
  unregisterPushToken(@Body() dto: RegisterPushTokenDto) {
    return this.restaurants.unregisterPushToken(dto.token);
  }

  // Self-service deletion — any logged-in device, any role, any approval
  // status can delete their own account (see RestaurantsService.deleteAccount
  // for what "their own account" means for a staff login vs the owner).
  @UseGuards(PartnerAuthGuard)
  @Delete('me/account')
  deleteAccount(@Req() req: { user: PartnerJwtPayload }) {
    return this.restaurants.deleteAccount(req.user);
  }

  @UseGuards(AdminAuthGuard)
  @Get()
  list(@Query() query: ListRestaurantsQuery) {
    return this.restaurants.list(query);
  }

  // Full, unpaginated - for the "pick a restaurant" dropdowns elsewhere in
  // the admin portal (Advertising's grant-placement picker, Feature Flags'
  // and Notifications' targeting pickers), which need every match at once
  // rather than a page of them. Must stay above the ':id' route below, or
  // NestJS would treat "picker" as an :id value. Declared before that route
  // so this always wins.
  @UseGuards(AdminAuthGuard)
  @Get('picker')
  picker(@Query('status') status?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED') {
    return this.restaurants.picker(status);
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
  @Patch(':id/chain')
  setChain(@Param('id') id: string, @Body() dto: SetChainDto) {
    return this.restaurants.setChain(id, dto.chainId ?? null);
  }

  // Full account access to any restaurant is powerful enough to keep behind
  // the stricter super-admin guard, not every moderator.
  @UseGuards(SuperAdminGuard)
  @Post(':id/admin-support-session')
  createAdminSupportSession(@Req() req: { user: AdminJwtPayload }, @Param('id') id: string) {
    return this.restaurants.createAdminSupportSession(req.user.sub, id);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id/stats-visibility')
  setStatsVisibility(@Param('id') id: string, @Body() dto: UpdateStatsVisibilityDto) {
    return this.restaurants.setStatsVisibility(id, dto.statsVisible);
  }

  @UseGuards(AdminAuthGuard)
  @Get(':id/publish-review')
  publishReview(@Param('id') id: string) {
    return this.restaurants.getPublishReview(id);
  }

  @UseGuards(AdminAuthGuard)
  @Get(':id/push-tokens')
  pushTokenDiagnostics(@Param('id') id: string) {
    return this.restaurants.pushTokenDiagnostics(id);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id/publish-moderate')
  moderatePublish(
    @Req() req: { user: AdminJwtPayload },
    @Param('id') id: string,
    @Body() dto: ModeratePublishDto,
  ) {
    return this.restaurants.moderatePublish(req.user.sub, id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  adminUpdate(@Param('id') id: string, @Body() dto: UpdateRestaurantProfileDto) {
    return this.restaurants.updateProfile(id, dto);
  }
}
