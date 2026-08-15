import { Controller, Get } from '@nestjs/common';
import { MasterDataService } from './master-data.service';

@Controller('master-data')
export class MasterDataController {
  constructor(private readonly masterData: MasterDataService) {}

  @Get('business-types')
  businessTypes() {
    return this.masterData.businessTypes();
  }

  @Get('food-categories')
  foodCategories() {
    return this.masterData.foodCategories();
  }

  @Get('menu-categories')
  menuCategories() {
    return this.masterData.menuCategories();
  }

  @Get('facilities')
  facilities() {
    return this.masterData.facilities();
  }

  @Get('provinces')
  provinces() {
    return this.masterData.provinces();
  }
}
