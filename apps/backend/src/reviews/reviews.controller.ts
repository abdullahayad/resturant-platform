import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReplyToReviewDto } from './dto/review.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@Controller('restaurants')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

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

  @UseGuards(PartnerAuthGuard)
  @Post('me/reviews/:id/reply')
  reply(@Req() req: { user: PartnerJwtPayload }, @Param('id') reviewId: string, @Body() dto: ReplyToReviewDto) {
    return this.reviews.reply(req.user.sub, reviewId, dto.text);
  }
}
