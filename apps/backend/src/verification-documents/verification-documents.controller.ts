import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { VerificationDocumentsService } from './verification-documents.service';
import { CreateVerificationDocumentDto } from './dto/verification-document.dto';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import { ManagerOrOwnerGuard } from '../auth/guards/manager-or-owner.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@Controller('restaurants/me/verification-documents')
export class VerificationDocumentsController {
  constructor(private readonly documents: VerificationDocumentsService) {}

  // Business licenses aren't menu content - same Manager/Owner bar as
  // submitting or removing one, so MENU_EDITOR staff can't read them either.
  @UseGuards(ManagerOrOwnerGuard)
  @Get()
  list(@Req() req: { user: PartnerJwtPayload }) {
    return this.documents.list(req.user.sub);
  }

  @UseGuards(ApprovedPartnerGuard, ManagerOrOwnerGuard)
  @Post()
  create(@Req() req: { user: PartnerJwtPayload }, @Body() dto: CreateVerificationDocumentDto) {
    return this.documents.create(req.user.sub, dto.url, req.user);
  }

  @UseGuards(ApprovedPartnerGuard, ManagerOrOwnerGuard)
  @Delete(':id')
  remove(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.documents.remove(req.user.sub, id, req.user);
  }
}
