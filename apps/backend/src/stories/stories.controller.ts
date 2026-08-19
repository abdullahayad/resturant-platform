import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@Controller('restaurants/me/stories')
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

  @UseGuards(ApprovedPartnerGuard)
  @Post()
  create(@Req() req: { user: PartnerJwtPayload }, @Body() dto: CreateStoryDto) {
    return this.stories.create(req.user.sub, dto);
  }

  @UseGuards(PartnerAuthGuard)
  @Get()
  active(@Req() req: { user: PartnerJwtPayload }) {
    return this.stories.active(req.user.sub);
  }
}
