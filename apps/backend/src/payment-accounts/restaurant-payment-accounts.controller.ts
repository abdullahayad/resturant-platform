import { Body, Controller, Delete, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { PaymentAccountsService } from './payment-accounts.service';
import { ConnectPaymentGatewayDto } from './dto/payment-account.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@Controller('restaurants/me/payment-accounts')
export class RestaurantPaymentAccountsController {
  constructor(private readonly paymentAccounts: PaymentAccountsService) {}

  @UseGuards(PartnerAuthGuard)
  @Get()
  get(@Req() req: { user: PartnerJwtPayload }) {
    return this.paymentAccounts.get(req.user.sub);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Put(':gateway')
  connect(@Req() req: { user: PartnerJwtPayload }, @Param('gateway') gateway: string, @Body() dto: ConnectPaymentGatewayDto) {
    return this.paymentAccounts.connect(req.user.sub, gateway, dto);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Delete(':gateway')
  disconnect(@Req() req: { user: PartnerJwtPayload }, @Param('gateway') gateway: string) {
    return this.paymentAccounts.disconnect(req.user.sub, gateway);
  }
}
