import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminActivityService } from './admin-activity.service';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { PageQueryDto } from '../common/pagination';

@UseGuards(AdminAuthGuard)
@Controller('admin-activity')
export class AdminActivityController {
  constructor(private readonly activity: AdminActivityService) {}

  @Get()
  list(@Query() query: PageQueryDto) {
    return this.activity.recentActivity(query.page);
  }
}
