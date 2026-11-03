import { Module } from '@nestjs/common';
import { HomeBannersController } from './home-banners.controller';
import { HomeBannersService } from './home-banners.service';

@Module({
  controllers: [HomeBannersController],
  providers: [HomeBannersService],
})
export class HomeBannersModule {}
