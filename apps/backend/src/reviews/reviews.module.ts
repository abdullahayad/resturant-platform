import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { AdminReviewsController } from './admin-reviews.controller';
import { ReviewsService } from './reviews.service';
import { PushModule } from '../push/push.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [PushModule, UploadsModule],
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
