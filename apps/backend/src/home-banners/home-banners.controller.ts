import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { HomeBannersService } from './home-banners.service';
import { HomeBannerDto } from './home-banners.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@Controller('home/banners')
export class HomeBannersController {
  constructor(private readonly banners: HomeBannersService) {}

  // Public: the banners showing on the customer app's Home right now.
  @Get()
  listActive() {
    return this.banners.listActive();
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin')
  list() {
    return this.banners.list();
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin')
  create(@Body() dto: HomeBannerDto) {
    return this.banners.create(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch('admin/:id')
  update(@Param('id') id: string, @Body() dto: HomeBannerDto) {
    return this.banners.update(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Delete('admin/:id')
  remove(@Param('id') id: string) {
    return this.banners.remove(id);
  }
}
