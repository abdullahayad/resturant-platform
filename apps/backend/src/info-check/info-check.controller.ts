import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import { ManagerOrOwnerGuard } from '../auth/guards/manager-or-owner.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';
import { InfoCheckService } from './info-check.service';

@Controller('info-check')
export class InfoCheckController {
  constructor(private readonly infoCheck: InfoCheckService) {}

  @UseGuards(ManagerOrOwnerGuard)
  @Get('me')
  status(@Req() req: { user: PartnerJwtPayload }) {
    return this.infoCheck.status(req.user.sub);
  }

  @UseGuards(ApprovedPartnerGuard, ManagerOrOwnerGuard)
  @Post('me/confirm')
  confirm(@Req() req: { user: PartnerJwtPayload }) {
    return this.infoCheck.confirm(req.user);
  }

  // Restaurants that haven't confirmed lately, longest first.
  @UseGuards(AdminAuthGuard)
  @Get('admin')
  overdue() {
    return this.infoCheck.overdue();
  }
}
