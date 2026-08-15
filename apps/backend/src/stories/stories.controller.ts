import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@UseGuards(PartnerAuthGuard)
@Controller('restaurants/me/stories')
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

  @Post()
  create(@Req() req: { user: PartnerJwtPayload }, @Body() dto: CreateStoryDto) {
    return this.stories.create(req.user.sub, dto);
  }

  @Get()
  active(@Req() req: { user: PartnerJwtPayload }) {
    return this.stories.active(req.user.sub);
  }
}
