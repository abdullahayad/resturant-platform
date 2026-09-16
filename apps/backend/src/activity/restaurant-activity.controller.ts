import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { PageQueryDto } from '../common/pagination';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@UseGuards(PartnerAuthGuard)
@Controller('restaurants/me/activity')
export class RestaurantActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  get(@Req() req: { user: PartnerJwtPayload }, @Query() query: PageQueryDto) {
    return this.activity.recentActivity(req.user.sub, req.user.staffRole !== 'MENU_EDITOR', query.page);
  }
}
