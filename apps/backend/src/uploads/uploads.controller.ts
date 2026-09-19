import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AppJwtPayload } from '../auth/jwt-payload';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- req is
  // still needed once moderation is re-enabled (see below); keeping the
  // signature ready rather than churning it twice.
  async upload(@Req() req: { user: AppJwtPayload }, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    // TEMPORARILY DISABLED (2026-09-19): loading nsfwjs's TF.js model plus
    // classifying a single real (~1600px, client-resized) photo measured
    // ~420MB peak RSS locally - enough to OOM-crash the backend on Render's
    // constrained instance, which is exactly what broke uploads in
    // production. Not safe to run in-process at this instance size. Needs a
    // genuinely different approach (a lighter model, an external API, a
    // separate worker process with its own memory ceiling, or a bigger
    // instance) before re-enabling - see moderation.service.ts, which is
    // left in place and still tested, just not called here for now.
    //
    // const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    // if (await this.moderation.isExplicit(file.buffer, ext)) {
    //   const restaurantId = req.user.type === 'partner' ? req.user.sub : null;
    //   await this.moderation.recordBlocked(restaurantId, file.originalname);
    //   throw new BadRequestException('This image was flagged as inappropriate and could not be uploaded.');
    // }

    return this.storage.upload(file, 'uploads');
  }
}
