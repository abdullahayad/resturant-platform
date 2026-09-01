import { BadRequestException, Body, Controller, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReplyToReviewDto } from './dto/review.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import { StorageService } from '../uploads/storage.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

const ALLOWED_PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

@Controller('restaurants')
export class ReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly storage: StorageService,
  ) {}

  // Public, unauthenticated upload used by a reviewer to get a URL before
  // posting a review with photos (create() below only accepts URLs, not raw
  // files) — same reasoning as create()'s throttle, images-only since these
  // land straight in the restaurant's gallery.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':id/reviews/photo-upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        if (!ext || !ALLOWED_PHOTO_EXTENSIONS.includes(ext)) {
          callback(new BadRequestException(`Unsupported file type. Allowed: ${ALLOWED_PHOTO_EXTENSIONS.join(', ')}`), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadPhoto(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.storage.upload(file, 'review-photos');
  }

  // Public, unauthenticated write with no identity check beyond free-text
  // reviewerName — throttled tighter than the app default (see security review).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':id/reviews')
  create(@Param('id') restaurantId: string, @Body() dto: CreateReviewDto) {
    return this.reviews.createForRestaurant(restaurantId, dto);
  }

  @UseGuards(PartnerAuthGuard)
  @Get('me/reviews')
  mine(@Req() req: { user: PartnerJwtPayload }) {
    return this.reviews.listForRestaurant(req.user.sub);
  }

  @UseGuards(PartnerAuthGuard)
  @Get('me/reviews/summary')
  summary(@Req() req: { user: PartnerJwtPayload }) {
    return this.reviews.summary(req.user.sub);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Post('me/reviews/:id/reply')
  reply(@Req() req: { user: PartnerJwtPayload }, @Param('id') reviewId: string, @Body() dto: ReplyToReviewDto) {
    return this.reviews.reply(req.user.sub, reviewId, dto.text);
  }
}
