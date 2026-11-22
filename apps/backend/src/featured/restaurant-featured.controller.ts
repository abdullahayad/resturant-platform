import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { FeaturedService } from './featured.service';
import { RequestFeaturedDto } from './dto/featured.dto';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import { PublishedPartnerGuard } from '../auth/guards/published-partner.guard';
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

  // Paid placement shows the restaurant to customers - only once published.
  @UseGuards(PublishedPartnerGuard, ManagerOrOwnerGuard)
  @Post()
  request(@Req() req: { user: PartnerJwtPayload }, @Body() dto: RequestFeaturedDto) {
    return this.featured.request(req.user.sub, dto, req.user);
  }

  @UseGuards(ApprovedPartnerGuard, ManagerOrOwnerGuard)
  @Delete(':id')
  cancel(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.featured.cancel(req.user.sub, id, req.user);
  }
}
