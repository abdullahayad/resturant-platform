import { Body, Controller, Delete, Get, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CustomerAuthService } from './customer-auth.service';
import { CustomersService } from './customers.service';
import { CustomerAuthGuard, type CustomerRequest } from './customer-auth.guard';
import { RequestCodeDto, ScanVisitDto, UpdateCustomerDto, VerifyCodeDto } from './dto/customer.dto';
import { PageQueryDto } from '../common/pagination';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

// Customer-app sign in: a 6-digit code on WhatsApp. Tight per-IP limits on
// top of the per-number limits inside CustomerAuthService.
@Controller('customer-auth')
export class CustomerAuthController {
  constructor(private readonly auth: CustomerAuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('request-code')
  requestCode(@Body() dto: RequestCodeDto) {
    return this.auth.requestCode(dto.phone);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verify')
  verify(@Body() dto: VerifyCodeDto) {
    return this.auth.verify(dto.phone, dto.code);
  }
}

@UseGuards(CustomerAuthGuard)
@Controller('customers/me')
export class CustomerMeController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  profile(@Req() req: CustomerRequest) {
    return this.customers.profile(req.customer.id);
  }

  @Patch()
  update(@Req() req: CustomerRequest, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(req.customer.id, dto);
  }

  @Get('visit-code')
  visitCode(@Req() req: CustomerRequest) {
    return this.customers.visitCode(req.customer.id);
  }

  @Get('visits')
  visits(@Req() req: CustomerRequest, @Query() query: PageQueryDto) {
    return this.customers.visits(req.customer.id, query.page);
  }

  @Delete()
  remove(@Req() req: CustomerRequest) {
    return this.customers.remove(req.customer.id);
  }
}

// Partner app: any staff member of an approved restaurant can scan (the
// cashier usually does it), as long as the Scan Visit flag is on for it.
@Controller('visits')
export class VisitsController {
  constructor(private readonly customers: CustomersService) {}

  @UseGuards(ApprovedPartnerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('scan')
  scan(@Req() req: { user: PartnerJwtPayload }, @Body() dto: ScanVisitDto) {
    return this.customers.scanVisit(req.user, dto.code);
  }
}
