import { Module } from '@nestjs/common';
import { RestaurantPaymentAccountsController } from './restaurant-payment-accounts.controller';
import { PaymentAccountsService } from './payment-accounts.service';

@Module({
  controllers: [RestaurantPaymentAccountsController],
  providers: [PaymentAccountsService],
})
export class PaymentAccountsModule {}
