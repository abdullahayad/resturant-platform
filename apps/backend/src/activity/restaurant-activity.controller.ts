import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@UseGuards(PartnerAuthGuard)
@Controller('restaurants/me/activity')
export class RestaurantActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  get(@Req() req: { user: PartnerJwtPayload }) {
    return this.activity.recentActivity(req.user.sub, req.user.staffRole !== 'MENU_EDITOR');
  }
}
