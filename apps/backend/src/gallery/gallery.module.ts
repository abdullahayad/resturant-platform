import { Module } from '@nestjs/common';
import { GalleryController } from './gallery.controller';
import { AdminGalleryController } from './admin-gallery.controller';
import { GalleryService } from './gallery.service';

@Module({
  controllers: [GalleryController, AdminGalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}
