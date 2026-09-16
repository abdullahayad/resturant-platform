import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PreviewService } from './preview.service';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@UseGuards(PartnerAuthGuard)
@Controller('restaurants/me/preview')
export class RestaurantPreviewController {
  constructor(private readonly preview: PreviewService) {}

  @Get()
  get(@Req() req: { user: PartnerJwtPayload }) {
    return this.preview.get(req.user.sub);
  }
}
