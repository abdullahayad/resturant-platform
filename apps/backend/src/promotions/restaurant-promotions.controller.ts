import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';
import { ApplyPromotionTemplateDto, CreatePromotionTemplateDto } from './dto/promotion-template.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import { PageQueryDto } from '../common/pagination';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@Controller('restaurants/me/promotions')
export class RestaurantPromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @UseGuards(PartnerAuthGuard)
  @Get()
  list(@Req() req: { user: PartnerJwtPayload }, @Query() query: PageQueryDto) {
    return this.promotions.list(req.user.sub, query.page);
  }

  // Lightweight count for the sidebar's "rejected promotions" badge - see
  // the equivalent reservations/events count for why this exists as its
  // own endpoint instead of reusing the (now paginated) list above.
  @UseGuards(PartnerAuthGuard)
  @Get('rejected-count')
  rejectedCount(@Req() req: { user: PartnerJwtPayload }) {
    return this.promotions.rejectedCount(req.user.sub);
  }

  @UseGuards(PartnerAuthGuard)
  @Get('summary')
  summary(@Req() req: { user: PartnerJwtPayload }) {
    return this.promotions.summary(req.user.sub);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Post()
  create(@Req() req: { user: PartnerJwtPayload }, @Body() dto: CreatePromotionDto) {
    return this.promotions.create(req.user.sub, dto, req.user);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Patch(':id')
  update(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotions.update(req.user.sub, id, dto, req.user);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Delete(':id')
  remove(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.promotions.remove(req.user.sub, id, req.user);
  }

  // ── Templates ─────────────────────────────────────────────────────────

  @UseGuards(PartnerAuthGuard)
  @Get('templates')
  listTemplates(@Req() req: { user: PartnerJwtPayload }) {
    return this.promotions.listTemplates(req.user.sub);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Post('templates')
  createTemplate(@Req() req: { user: PartnerJwtPayload }, @Body() dto: CreatePromotionTemplateDto) {
    return this.promotions.createTemplate(req.user.sub, dto);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Delete('templates/:id')
  removeTemplate(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.promotions.removeTemplate(req.user.sub, id);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Post('templates/:id/apply')
  applyTemplate(
    @Req() req: { user: PartnerJwtPayload },
    @Param('id') id: string,
    @Body() dto: ApplyPromotionTemplateDto,
  ) {
    return this.promotions.applyTemplate(req.user.sub, id, dto, req.user);
  }
}
