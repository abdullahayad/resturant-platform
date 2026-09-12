import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

// Bare PartnerAuthGuard, no role/approval restriction — every staff login
// (including MENU_EDITOR, and regardless of approval status) needs this to
// render its own sidebar correctly.
@UseGuards(PartnerAuthGuard)
@Controller('restaurants/me/feature-flags')
export class RestaurantFeatureFlagsController {
  constructor(private readonly featureFlags: FeatureFlagsService) {}

  @Get()
  list(@Req() req: { user: PartnerJwtPayload }) {
    return this.featureFlags.resolveEnabledKeys(req.user.sub);
  }
}
