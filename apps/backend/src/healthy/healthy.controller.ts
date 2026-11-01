import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { HealthyService } from './healthy.service';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import { ManagerOrOwnerGuard } from '../auth/guards/manager-or-owner.guard';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

class HealthyRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class HealthyDecisionDto {
  @IsBoolean()
  isHealthy: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

class HealthyListQuery {
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

@Controller()
export class HealthyController {
  constructor(private readonly healthy: HealthyService) {}

  @UseGuards(PartnerAuthGuard)
  @Get('restaurants/me/healthy')
  status(@Req() req: { user: PartnerJwtPayload }) {
    return this.healthy.status(req.user.sub);
  }

  @UseGuards(ApprovedPartnerGuard, ManagerOrOwnerGuard)
  @Post('restaurants/me/healthy-request')
  request(@Req() req: { user: PartnerJwtPayload }, @Body() dto: HealthyRequestDto) {
    return this.healthy.request(req.user.sub, dto.note, req.user);
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/healthy')
  adminList(@Query() query: HealthyListQuery) {
    return this.healthy.adminList(query.status);
  }

  @UseGuards(AdminAuthGuard)
  @Patch('admin/healthy/:restaurantId')
  adminDecide(@Param('restaurantId') restaurantId: string, @Body() dto: HealthyDecisionDto) {
    return this.healthy.adminDecide(restaurantId, dto.isHealthy, dto.reason);
  }
}
