import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { CreateLoyaltyTierDto, UpdateLoyaltyTierDto } from './dto/loyalty-tier.dto';
import { GrantLoyaltyRewardDto } from './dto/loyalty-reward.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import type { AdminJwtPayload } from '../auth/jwt-payload';

@UseGuards(AdminAuthGuard)
@Controller('admin/loyalty')
export class AdminLoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('tiers')
  tiers() {
    return this.loyalty.tiers();
  }

  @Post('tiers')
  createTier(@Body() dto: CreateLoyaltyTierDto) {
    return this.loyalty.createTier(dto);
  }

  @Patch('tiers/:id')
  updateTier(@Param('id') id: string, @Body() dto: UpdateLoyaltyTierDto) {
    return this.loyalty.updateTier(id, dto);
  }

  // Deliberately the only guest-data read path, and it requires a specific
  // phone number — there is no un-parameterized "list all guests" route,
  // so admin visibility only ever starts from a number they already have.
  @Get('guests/:phone')
  guestLookup(@Param('phone') phone: string) {
    return this.loyalty.guestLookup(phone);
  }

  @Post('rewards/grant')
  grant(@Req() req: { user: AdminJwtPayload }, @Body() dto: GrantLoyaltyRewardDto) {
    return this.loyalty.grant(req.user.sub, dto);
  }

  @Patch('rewards/:id/redeem')
  redeem(@Param('id') id: string) {
    return this.loyalty.redeem(id);
  }
}
