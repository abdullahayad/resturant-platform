import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ListReviewsQuery, ModerateReviewDto } from './dto/review.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller('reviews')
export class AdminReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(@Query() query: ListReviewsQuery) {
    return this.reviews.listAll(query.status);
  }

  @Patch(':id/moderate')
  moderate(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
    return this.reviews.moderate(id, dto);
  }
}
