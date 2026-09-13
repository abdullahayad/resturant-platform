import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@UseGuards(PartnerAuthGuard)
@Controller('restaurants/me/analytics')
export class RestaurantAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  get(@Req() req: { user: PartnerJwtPayload }) {
    return this.analytics.restaurantAnalytics(req.user.sub);
  }
}
