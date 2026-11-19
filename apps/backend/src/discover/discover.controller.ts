import { Controller, Get, Query } from '@nestjs/common';
import { DiscoverService } from './discover.service';
import { DiscoverListsService } from './discover-lists.service';
import { DiscoverQueryDto, SurpriseQueryDto } from './dto/discover-query.dto';
import {
  BudgetDishesQueryDto,
  DiscoverEventsQueryDto,
  DishSearchQueryDto,
  OffersQueryDto,
} from './dto/discover-lists.dto';
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

  @Get('surprise')
  surprise(@Query() query: SurpriseQueryDto) {
    return this.discover.surprise(query);
  }

  @Get('featured')
  featured() {
    return this.discover.featured();
  }

  @Get('offers')
  offers(@Query() query: OffersQueryDto) {
    return this.lists.offers(query.page, new Date(), { sort: query.sort, lat: query.lat, lng: query.lng });
  }

  @Get('budget-dishes')
  budgetDishes(@Query() query: BudgetDishesQueryDto) {
    return this.lists.budgetDishes(query.maxPrice, query.page, new Date(), {
      minPrice: query.minPrice,
      cuisineId: query.cuisineId,
      healthyOnly: query.healthyOnly,
    });
  }

  @Get('dishes')
  searchDishes(@Query() query: DishSearchQueryDto) {
    return this.lists.searchDishes(query.q, query.page);
  }

  @Get('healthy-dishes')
  healthyDishes(@Query() query: PageQueryDto) {
    return this.lists.healthyDishes(query.page);
  }

  @Get('cuisines')
  cuisines() {
    return this.lists.cuisines();
  }

  @Get('chefs')
  chefs() {
    return this.lists.chefs();
  }

  @Get('events')
  events(@Query() query: DiscoverEventsQueryDto) {
    return this.lists.events(query);
  }
}
