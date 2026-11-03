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
import { Throttle } from '@nestjs/throttler';
import { CustomerAuthService } from './customer-auth.service';
import { CustomersService } from './customers.service';
import { FollowsService } from './follows.service';
import { RestaurantCustomersService } from './restaurant-customers.service';
import { CustomerAuthGuard, type CustomerRequest } from './customer-auth.guard';
import { RequestCodeDto, ScanVisitDto, UpdateCustomerDto, VerifyCodeDto } from './dto/customer.dto';
import { PageQueryDto } from '../common/pagination';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import { ManagerOrOwnerGuard } from '../auth/guards/manager-or-owner.guard';
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
  constructor(
    private readonly customers: CustomersService,
    private readonly follows: FollowsService,
  ) {}

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

  @Get('follows')
  followedRestaurants(@Req() req: CustomerRequest) {
    return this.follows.list(req.customer.id);
  }

  @Get('follows/ids')
  followedIds(@Req() req: CustomerRequest) {
    return this.follows.ids(req.customer.id);
  }

  @Post('follows/:restaurantId')
  follow(@Req() req: CustomerRequest, @Param('restaurantId', ParseUUIDPipe) restaurantId: string) {
    return this.follows.follow(req.customer.id, restaurantId);
  }

  @Delete('follows/:restaurantId')
  unfollow(@Req() req: CustomerRequest, @Param('restaurantId', ParseUUIDPipe) restaurantId: string) {
    return this.follows.unfollow(req.customer.id, restaurantId);
  }
}

// Partner app: the restaurant's own verified visits and followers. Owner
// and managers only - it lists customers by name.
@UseGuards(ManagerOrOwnerGuard)
@Controller('restaurants/me')
export class RestaurantCustomersController {
  constructor(private readonly restaurantCustomers: RestaurantCustomersService) {}

  @Get('customers/summary')
  summary(@Req() req: { user: PartnerJwtPayload }) {
    return this.restaurantCustomers.summary(req.user.sub);
  }

  @Get('customers/visits')
  visits(@Req() req: { user: PartnerJwtPayload }, @Query() query: PageQueryDto) {
    return this.restaurantCustomers.visits(req.user.sub, query.page);
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
