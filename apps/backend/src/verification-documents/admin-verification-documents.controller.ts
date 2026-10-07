import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { VerificationDocumentsService } from './verification-documents.service';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

// Restaurant-scoped, not a cross-restaurant moderation queue (unlike gallery/
// dish moderation) - the question here is always "is this one restaurant
// legit," answered by an admin looking at one restaurant's own documents,
// not a platform-wide feed of today's new uploads.
@UseGuards(AdminAuthGuard)
@Controller('admin/restaurants/:id/verification-documents')
export class AdminVerificationDocumentsController {
  constructor(private readonly documents: VerificationDocumentsService) {}

  @Get()
  list(@Param('id') id: string) {
    return this.documents.list(id);
  }
}
