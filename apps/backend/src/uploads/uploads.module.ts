import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { StorageService } from './storage.service';
import { ModerationService } from './moderation.service';

@Module({
  controllers: [UploadsController],
  providers: [StorageService, ModerationService],
  exports: [StorageService],
})
export class UploadsModule {}
