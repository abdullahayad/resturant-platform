import { Controller, Get, Query } from '@nestjs/common';
import { DiscoverService } from './discover.service';
import { DiscoverQueryDto } from './dto/discover-query.dto';

// Public, no login: the customer app's Explore, search, moods and Home
// rows. Only live restaurants (approved + published) are ever returned.
// The filter lists themselves (cuisines, facilities, provinces...) already
// come from the public /master-data endpoints.
@Controller('discover')
export class DiscoverController {
  constructor(private readonly discover: DiscoverService) {}

  @Get('restaurants')
  search(@Query() query: DiscoverQueryDto) {
    return this.discover.search(query);
  }

  @Get('featured')
  featured() {
    return this.discover.featured();
  }
}
