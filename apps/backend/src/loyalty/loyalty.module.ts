import { Module } from '@nestjs/common';
import { AdminLoyaltyController } from './admin-loyalty.controller';
import { LoyaltyService } from './loyalty.service';

@Module({
  controllers: [AdminLoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService], // EventsModule needs this for reservation-status auto-issuance and the reservations-list tier badge
})
export class LoyaltyModule {}
