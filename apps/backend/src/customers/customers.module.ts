import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { CustomerAuthController, CustomerMeController, VisitsController } from './customers.controller';
import { CustomerAuthService } from './customer-auth.service';
import { CustomersService } from './customers.service';
import { CustomerAuthGuard } from './customer-auth.guard';
import { WhatsAppSenderService } from './whatsapp-sender.service';

@Module({
  imports: [AuthModule, FeatureFlagsModule],
  controllers: [CustomerAuthController, CustomerMeController, VisitsController],
  providers: [CustomerAuthService, CustomersService, CustomerAuthGuard, WhatsAppSenderService],
})
export class CustomersModule {}
