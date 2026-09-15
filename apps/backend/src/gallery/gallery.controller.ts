import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { CreateGalleryPhotoDto, ListGalleryQuery, SetGalleryCoverDto } from './dto/gallery-photo.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@Controller('restaurants/me/gallery')
export class GalleryController {
  constructor(private readonly gallery: GalleryService) {}

  @UseGuards(PartnerAuthGuard)
  @Get()
  list(@Req() req: { user: PartnerJwtPayload }, @Query() query: ListGalleryQuery) {
    return this.gallery.list(
      req.user.sub,
      query.album,
      { mostOrdered: query.mostOrdered, menuCategoryId: query.menuCategoryId, ambienceSubCategory: query.ambienceSubCategory },
      query.page,
    );
  }

  @UseGuards(ApprovedPartnerGuard)
  @Post()
  create(@Req() req: { user: PartnerJwtPayload }, @Body() dto: CreateGalleryPhotoDto) {
    return this.gallery.create(req.user.sub, dto);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Delete(':id')
  remove(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.gallery.remove(req.user.sub, id);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Patch(':id/cover')
  setCover(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string, @Body() dto: SetGalleryCoverDto) {
    return this.gallery.setCover(req.user.sub, id, dto.cover);
  }
}
