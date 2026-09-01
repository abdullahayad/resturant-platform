import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { PushModule } from '../push/push.module';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';

@Module({
  imports: [AuthModule, EmailModule, PushModule],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
})
export class RestaurantsModule {}
