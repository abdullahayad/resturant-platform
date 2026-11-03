import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import {
  CustomerAuthController,
  CustomerMeController,
  RestaurantCustomersController,
  VisitsController,
} from './customers.controller';
import { FollowsService } from './follows.service';
import { RestaurantCustomersService } from './restaurant-customers.service';
import { CustomerAuthService } from './customer-auth.service';
import { CustomersService } from './customers.service';
import { CustomerAuthGuard } from './customer-auth.guard';
import { WhatsAppSenderService } from './whatsapp-sender.service';

@Module({
  imports: [AuthModule, FeatureFlagsModule],
  controllers: [CustomerAuthController, CustomerMeController, VisitsController, RestaurantCustomersController],
  providers: [
    CustomerAuthService,
    CustomersService,
    FollowsService,
    RestaurantCustomersService,
    CustomerAuthGuard,
    WhatsAppSenderService,
  ],
})
export class CustomersModule {}
