import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { PushModule } from '../push/push.module';
import { CustomerActivityService } from './customer-activity.service';
import { CustomerSupportService } from './customer-support.service';
import { AdminCustomersService } from './admin-customers.service';
import {
  AdminCampaignsController,
  AdminCustomerSupportController,
  AdminCustomersController,
  AdminReportsController,
} from './admin-customers.controller';
import { CampaignsService } from './campaigns.service';
import { CriticsService } from './critics.service';
import { ReportsService } from './reports.service';
import {
  CustomerAuthController,
  CriticsController,
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
  imports: [AuthModule, FeatureFlagsModule, ReviewsModule, PushModule],
  controllers: [
    CustomerAuthController,
    CustomerMeController,
    VisitsController,
    RestaurantCustomersController,
    AdminCustomersController,
    AdminCustomerSupportController,
    AdminReportsController,
    AdminCampaignsController,
    CriticsController,
  ],
  providers: [
    CustomerAuthService,
    CustomersService,
    FollowsService,
    CustomerActivityService,
    CustomerSupportService,
    AdminCustomersService,
    CriticsService,
    ReportsService,
    CampaignsService,
    RestaurantCustomersService,
    CustomerAuthGuard,
    WhatsAppSenderService,
  ],
})
export class CustomersModule {}
