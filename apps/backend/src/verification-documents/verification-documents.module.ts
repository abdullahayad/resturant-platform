import { Module } from '@nestjs/common';
import { VerificationDocumentsController } from './verification-documents.controller';
import { AdminVerificationDocumentsController } from './admin-verification-documents.controller';
import { VerificationDocumentsService } from './verification-documents.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [VerificationDocumentsController, AdminVerificationDocumentsController],
  providers: [VerificationDocumentsService],
})
export class VerificationDocumentsModule {}
