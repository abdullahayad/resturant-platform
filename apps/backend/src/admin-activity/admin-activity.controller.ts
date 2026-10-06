import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminActivityService } from './admin-activity.service';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { AdminActivityQueryDto } from './dto/admin-activity-query.dto';

@UseGuards(AdminAuthGuard)
@Controller('admin-activity')
export class AdminActivityController {
  constructor(private readonly activity: AdminActivityService) {}

  @Get()
  list(@Query() query: AdminActivityQueryDto) {
    return this.activity.recentActivity(query.page, query.section);
  }

  @Get('recent-blocked-count')
  recentBlockedCount() {
    return this.activity.recentBlockedCount();
  }
}
