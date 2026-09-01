import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { ListGalleryPhotosQuery, ModerateGalleryPhotoDto } from './dto/gallery-photo.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller('admin/gallery-photos')
export class AdminGalleryController {
  constructor(private readonly gallery: GalleryService) {}

  @Get()
  list(@Query() query: ListGalleryPhotosQuery) {
    return this.gallery.adminList(query.status);
  }

  @Patch(':id/moderate')
  moderate(@Param('id') id: string, @Body() dto: ModerateGalleryPhotoDto) {
    return this.gallery.moderate(id, dto);
  }
}
