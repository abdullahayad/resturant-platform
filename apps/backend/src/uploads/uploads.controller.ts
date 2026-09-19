import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov'];

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly storage: StorageService,
    private readonly moderation: ModerationService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 },
      // First line of defense (multer rejects before the file is even fully
      // buffered); storage.service.ts re-validates independently rather than
      // trusting this alone, since the extension here is still client-supplied.
      fileFilter: (_req, file, callback) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
          callback(new BadRequestException(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    if (await this.moderation.isExplicit(file.buffer, ext)) {
      throw new BadRequestException('This image was flagged as inappropriate and could not be uploaded.');
    }

    return this.storage.upload(file, 'uploads');
  }
}
