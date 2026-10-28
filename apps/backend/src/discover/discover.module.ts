import { Module } from '@nestjs/common';
import { DiscoverController } from './discover.controller';
import { DiscoverService } from './discover.service';
import { DiscoverListsService } from './discover-lists.service';

@Module({
  controllers: [DiscoverController],
  providers: [DiscoverService, DiscoverListsService],
})
export class DiscoverModule {}
