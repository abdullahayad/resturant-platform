import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import type { AdminJwtPayload } from '../auth/jwt-payload';
import { PageQueryDto } from '../common/pagination';
import { AdminCustomersService } from './admin-customers.service';
import { CustomerSupportService, SUPPORT_STATUSES, type SupportStatusValue } from './customer-support.service';
import {
  REPORT_ACTIONS,
  REPORT_STATUSES,
  ReportsService,
  type ReportActionValue,
  type ReportStatusValue,
} from './reports.service';
import { CampaignsService } from './campaigns.service';
import { HOME_BANNER_LINKS, type HomeBannerLinkValue } from '../home-banners/home-banners.dto';

class AdminCustomersQuery extends PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean()
  blocked?: boolean;
}

class BlockCustomerDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason: string;
}

class CampaignAudienceDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  minLevel?: number;

  @IsOptional()
  @IsUUID()
  followersOfRestaurantId?: string;
}

class SendCampaignDto extends CampaignAudienceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(65)
  titleEn: string;

  @IsString()
  @MinLength(1)
  @MaxLength(65)
  titleAr: string;

  @IsString()
  @MinLength(1)
  @MaxLength(178)
  bodyEn: string;

  @IsString()
  @MinLength(1)
  @MaxLength(178)
  bodyAr: string;

  @IsOptional()
  @IsIn(HOME_BANNER_LINKS)
  linkType?: HomeBannerLinkValue;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  linkValue?: string;
}

class StarDto {
  @IsBoolean()
  isStar: boolean;
}

class CriticHiddenDto {
  @IsBoolean()
  hidden: boolean;
}

class ReportListQuery extends PageQueryDto {
  @IsOptional()
  @IsIn(REPORT_STATUSES)
  status?: ReportStatusValue;
}

class ResolveReportDto {
  @IsIn(REPORT_ACTIONS)
  action: ReportActionValue;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

class SupportListQuery extends PageQueryDto {
  @IsOptional()
  @IsIn(SUPPORT_STATUSES)
  status?: SupportStatusValue;
}

class SupportReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;
}

class SupportStatusDto {
  @IsIn(SUPPORT_STATUSES)
  status: SupportStatusValue;
}

@UseGuards(AdminAuthGuard)
@Controller('admin/customers')
export class AdminCustomersController {
  constructor(private readonly customers: AdminCustomersService) {}

  @Get()
  list(@Query() query: AdminCustomersQuery) {
    return this.customers.list(query);
  }

  @Get('alerts')
  alerts() {
    return this.customers.alerts();
  }

  @Get('stats')
  stats() {
    return this.customers.stats();
  }

  @Get('levels')
  levels() {
    return this.customers.levels();
  }

  @Get('critics')
  critics() {
    return this.customers.critics();
  }

  @Patch(':id/star')
  setStar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StarDto) {
    return this.customers.setStar(id, dto.isStar);
  }

  @Patch(':id/critic-hidden')
  setCriticHidden(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CriticHiddenDto) {
    return this.customers.setCriticHidden(id, dto.hidden);
  }

  @Delete('visits/:visitId')
  removeVisit(@Param('visitId', ParseUUIDPipe) visitId: string) {
    return this.customers.removeVisit(visitId);
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.detail(id);
  }

  @Patch(':id/block')
  block(@Req() req: { user: AdminJwtPayload }, @Param('id', ParseUUIDPipe) id: string, @Body() dto: BlockCustomerDto) {
    return this.customers.block(id, req.user.sub, dto.reason);
  }

  @Patch(':id/unblock')
  unblock(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.unblock(id);
  }

  @Post(':id/sign-out')
  signOut(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.signOutEverywhere(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.remove(id);
  }
}

@UseGuards(AdminAuthGuard)
@Controller('admin/customer-support')
export class AdminCustomerSupportController {
  constructor(private readonly support: CustomerSupportService) {}

  @Get()
  list(@Query() query: SupportListQuery) {
    return this.support.adminList(query.status, query.page);
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.support.adminDetail(id);
  }

  @Post(':id/reply')
  reply(@Req() req: { user: AdminJwtPayload }, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SupportReplyDto) {
    return this.support.adminReply(id, req.user.sub, dto.text);
  }

  @Patch(':id/status')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SupportStatusDto) {
    return this.support.adminSetStatus(id, dto.status);
  }
}

@UseGuards(AdminAuthGuard)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(@Query() query: ReportListQuery) {
    return this.reports.adminList(query.status, query.page);
  }

  @Patch(':id')
  resolve(
    @Req() req: { user: AdminJwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.reports.adminResolve(id, req.user.sub, dto.action, dto.note);
  }
}

@UseGuards(AdminAuthGuard)
@Controller('admin/campaigns')
export class AdminCampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  history(@Query() query: PageQueryDto) {
    return this.campaigns.history(query.page);
  }

  @Post('preview')
  preview(@Body() dto: CampaignAudienceDto) {
    return this.campaigns.preview(dto);
  }

  @Post()
  send(@Req() req: { user: AdminJwtPayload }, @Body() dto: SendCampaignDto) {
    return this.campaigns.send(dto, req.user.sub);
  }
}
