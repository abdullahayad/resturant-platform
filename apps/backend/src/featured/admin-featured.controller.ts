import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FeaturedService } from './featured.service';
import { GrantFeaturedDto, ListFeaturedQuery, ModerateFeaturedDto } from './dto/featured.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import type { AdminJwtPayload } from '../auth/jwt-payload';

@UseGuards(AdminAuthGuard)
@Controller('admin/featured')
export class AdminFeaturedController {
  constructor(private readonly featured: FeaturedService) {}

  @Get()
  list(@Query() query: ListFeaturedQuery) {
    return this.featured.adminList(query.status);
  }

  @Post('grant')
  grant(@Req() req: { user: AdminJwtPayload }, @Body() dto: GrantFeaturedDto) {
    return this.featured.grant(req.user.sub, dto);
  }

  @Patch(':id/moderate')
  moderate(@Req() req: { user: AdminJwtPayload }, @Param('id') id: string, @Body() dto: ModerateFeaturedDto) {
    return this.featured.moderate(req.user.sub, id, dto);
  }

  @Patch(':id/revoke')
  revoke(@Param('id') id: string) {
    return this.featured.revoke(id);
  }
}
