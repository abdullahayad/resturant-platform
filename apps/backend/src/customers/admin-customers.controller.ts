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
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import type { AdminJwtPayload } from '../auth/jwt-payload';
import { PageQueryDto } from '../common/pagination';
import { AdminCustomersService } from './admin-customers.service';
import { CustomerSupportService, SUPPORT_STATUSES, type SupportStatusValue } from './customer-support.service';

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

  @Get('stats')
  stats() {
    return this.customers.stats();
  }

  @Get('levels')
  levels() {
    return this.customers.levels();
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
