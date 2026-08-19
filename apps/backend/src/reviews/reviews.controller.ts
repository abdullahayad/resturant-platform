import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReplyToReviewDto } from './dto/review.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@Controller('restaurants')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

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
