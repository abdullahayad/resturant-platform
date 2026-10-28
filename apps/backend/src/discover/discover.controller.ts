import { Controller, Get, Query } from '@nestjs/common';
import { DiscoverService } from './discover.service';
import { DiscoverListsService } from './discover-lists.service';
import { DiscoverQueryDto } from './dto/discover-query.dto';
import { BudgetDishesQueryDto, DiscoverEventsQueryDto } from './dto/discover-lists.dto';
import { PageQueryDto } from '../common/pagination';

// Public, no login: the customer app's Explore, search, moods, Home rows,
// Offers and Events tabs. Only live restaurants (approved + published) are
// ever returned. The filter lists themselves (cuisines, facilities,
// provinces...) already come from the public /master-data endpoints.
@Controller('discover')
export class DiscoverController {
  constructor(
    private readonly discover: DiscoverService,
    private readonly lists: DiscoverListsService,
  ) {}

  @Get('restaurants')
  search(@Query() query: DiscoverQueryDto) {
    return this.discover.search(query);
  }

  @Get('featured')
  featured() {
    return this.discover.featured();
  }

  @Get('offers')
  offers(@Query() query: PageQueryDto) {
    return this.lists.offers(query.page);
  }

  @Get('budget-dishes')
  budgetDishes(@Query() query: BudgetDishesQueryDto) {
    return this.lists.budgetDishes(query.maxPrice, query.page);
  }

  @Get('events')
  events(@Query() query: DiscoverEventsQueryDto) {
    return this.lists.events(query);
  }
}
