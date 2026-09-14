import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { ListPromotionsQuery, ModeratePromotionDto } from './dto/promotion.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import type { AdminJwtPayload } from '../auth/jwt-payload';

@UseGuards(AdminAuthGuard)
@Controller('admin/promotions')
export class AdminPromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get()
  list(@Query() query: ListPromotionsQuery) {
    return this.promotions.adminList(query.status, query.page);
  }

  @Patch(':id/moderate')
  moderate(@Req() req: { user: AdminJwtPayload }, @Param('id') id: string, @Body() dto: ModeratePromotionDto) {
    return this.promotions.moderate(req.user.sub, id, dto);
  }
}
