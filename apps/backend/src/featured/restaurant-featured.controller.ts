import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { FeaturedService } from './featured.service';
import { RequestFeaturedDto } from './dto/featured.dto';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import { ManagerOrOwnerGuard } from '../auth/guards/manager-or-owner.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@Controller('restaurants/me/featured')
export class RestaurantFeaturedController {
  constructor(private readonly featured: FeaturedService) {}

  @UseGuards(ManagerOrOwnerGuard)
  @Get()
  list(@Req() req: { user: PartnerJwtPayload }) {
    return this.featured.listForRestaurant(req.user.sub);
  }

  @UseGuards(ApprovedPartnerGuard, ManagerOrOwnerGuard)
  @Post()
  request(@Req() req: { user: PartnerJwtPayload }, @Body() dto: RequestFeaturedDto) {
    return this.featured.request(req.user.sub, dto);
  }

  @UseGuards(ApprovedPartnerGuard, ManagerOrOwnerGuard)
  @Delete(':id')
  cancel(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.featured.cancel(req.user.sub, id);
  }
}
