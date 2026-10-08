import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VerificationDocumentsService } from './verification-documents.service';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import { ManagerOrOwnerGuard } from '../auth/guards/manager-or-owner.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';
import { ALLOWED_PRIVATE_UPLOADS, extensionOf } from '../uploads/storage-config';

@Controller('restaurants/me/verification-documents')
export class VerificationDocumentsController {
  constructor(private readonly documents: VerificationDocumentsService) {}

  // Business licenses aren't menu content - same Manager/Owner bar as
  // submitting or removing one, so MENU_EDITOR staff can't read them either.
  @UseGuards(ManagerOrOwnerGuard)
  @Get()
  list(@Req() req: { user: PartnerJwtPayload }) {
    return this.documents.list(req.user.sub);
  }

  // Multipart upload straight to the private bucket, rather than the
  // generic /uploads route (public bucket) followed by submitting its URL.
  @UseGuards(ApprovedPartnerGuard, ManagerOrOwnerGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
      // Rejects a wrong extension before multer buffers the whole body -
      // StorageService.uploadPrivate still re-checks the actual bytes.
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_PRIVATE_UPLOADS[extensionOf(file.originalname)]) {
          const allowed = Object.keys(ALLOWED_PRIVATE_UPLOADS).join(', ');
          callback(new BadRequestException(`Unsupported file type. Allowed: ${allowed}`), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  create(@Req() req: { user: PartnerJwtPayload }, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.documents.create(req.user.sub, file, req.user);
  }

  @UseGuards(ApprovedPartnerGuard, ManagerOrOwnerGuard)
  @Delete(':id')
  remove(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.documents.remove(req.user.sub, id, req.user);
  }
}
