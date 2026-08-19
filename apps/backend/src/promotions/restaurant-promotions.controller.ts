import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@Controller('restaurants/me/promotions')
export class RestaurantPromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @UseGuards(PartnerAuthGuard)
  @Get()
  list(@Req() req: { user: PartnerJwtPayload }) {
    return this.promotions.list(req.user.sub);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Post()
  create(@Req() req: { user: PartnerJwtPayload }, @Body() dto: CreatePromotionDto) {
    return this.promotions.create(req.user.sub, dto);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Patch(':id')
  update(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotions.update(req.user.sub, id, dto);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Delete(':id')
  remove(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.promotions.remove(req.user.sub, id);
  }
}
