import { Module } from '@nestjs/common';
import { AdminActivityController } from './admin-activity.controller';
import { AdminActivityService } from './admin-activity.service';

@Module({
  controllers: [AdminActivityController],
  providers: [AdminActivityService],
})
export class AdminActivityModule {}
