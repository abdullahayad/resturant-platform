import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MasterDataService } from './master-data.service';
import { CreateMasterDataItemDto, UpdateMasterDataItemDto } from './dto/master-data-item.dto';
import {
  CreateDistrictDto,
  CreateProvinceDto,
  UpdateDistrictDto,
  UpdateProvinceDto,
} from './dto/province-district.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@Controller('master-data')
export class MasterDataController {
  constructor(private readonly masterData: MasterDataService) {}

  // ── public reads, used by the partner app's pickers ──────────────────
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

  @Get('event-types')
  eventTypes() {
    return this.masterData.eventTypes();
  }

  // ── admin CRUD ─────────────────────────────────────────────────────
  @UseGuards(AdminAuthGuard)
  @Get('admin/business-types')
  adminBusinessTypes() {
    return this.masterData.allBusinessTypes();
  }
  @UseGuards(AdminAuthGuard)
  @Post('admin/business-types')
  createBusinessType(@Body() dto: CreateMasterDataItemDto) {
    return this.masterData.createBusinessType(dto);
  }
  @UseGuards(AdminAuthGuard)
  @Patch('admin/business-types/:id')
  updateBusinessType(@Param('id') id: string, @Body() dto: UpdateMasterDataItemDto) {
    return this.masterData.updateBusinessType(id, dto);
  }
  @UseGuards(AdminAuthGuard)
  @Delete('admin/business-types/:id')
  deleteBusinessType(@Param('id') id: string) {
    return this.masterData.deleteBusinessType(id);
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/food-categories')
  adminFoodCategories() {
    return this.masterData.allFoodCategories();
  }
  @UseGuards(AdminAuthGuard)
  @Post('admin/food-categories')
  createFoodCategory(@Body() dto: CreateMasterDataItemDto) {
    return this.masterData.createFoodCategory(dto);
  }
  @UseGuards(AdminAuthGuard)
  @Patch('admin/food-categories/:id')
  updateFoodCategory(@Param('id') id: string, @Body() dto: UpdateMasterDataItemDto) {
    return this.masterData.updateFoodCategory(id, dto);
  }
  @UseGuards(AdminAuthGuard)
  @Delete('admin/food-categories/:id')
  deleteFoodCategory(@Param('id') id: string) {
    return this.masterData.deleteFoodCategory(id);
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/menu-categories')
  adminMenuCategories() {
    return this.masterData.allMenuCategories();
  }
  @UseGuards(AdminAuthGuard)
  @Post('admin/menu-categories')
  createMenuCategory(@Body() dto: CreateMasterDataItemDto) {
    return this.masterData.createMenuCategory(dto);
  }
  @UseGuards(AdminAuthGuard)
  @Patch('admin/menu-categories/:id')
  updateMenuCategory(@Param('id') id: string, @Body() dto: UpdateMasterDataItemDto) {
    return this.masterData.updateMenuCategory(id, dto);
  }
  @UseGuards(AdminAuthGuard)
  @Delete('admin/menu-categories/:id')
  deleteMenuCategory(@Param('id') id: string) {
    return this.masterData.deleteMenuCategory(id);
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/facilities')
  adminFacilities() {
    return this.masterData.allFacilities();
  }
  @UseGuards(AdminAuthGuard)
  @Post('admin/facilities')
  createFacility(@Body() dto: CreateMasterDataItemDto) {
    return this.masterData.createFacility(dto);
  }
  @UseGuards(AdminAuthGuard)
  @Patch('admin/facilities/:id')
  updateFacility(@Param('id') id: string, @Body() dto: UpdateMasterDataItemDto) {
    return this.masterData.updateFacility(id, dto);
  }
  @UseGuards(AdminAuthGuard)
  @Delete('admin/facilities/:id')
  deleteFacility(@Param('id') id: string) {
    return this.masterData.deleteFacility(id);
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/event-types')
  adminEventTypes() {
    return this.masterData.allEventTypes();
  }
  @UseGuards(AdminAuthGuard)
  @Post('admin/event-types')
  createEventType(@Body() dto: CreateMasterDataItemDto) {
    return this.masterData.createEventType(dto);
  }
  @UseGuards(AdminAuthGuard)
  @Patch('admin/event-types/:id')
  updateEventType(@Param('id') id: string, @Body() dto: UpdateMasterDataItemDto) {
    return this.masterData.updateEventType(id, dto);
  }
  @UseGuards(AdminAuthGuard)
  @Delete('admin/event-types/:id')
  deleteEventType(@Param('id') id: string) {
    return this.masterData.deleteEventType(id);
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/provinces')
  adminProvinces() {
    return this.masterData.allProvinces();
  }
  @UseGuards(AdminAuthGuard)
  @Post('admin/provinces')
  createProvince(@Body() dto: CreateProvinceDto) {
    return this.masterData.createProvince(dto);
  }
  @UseGuards(AdminAuthGuard)
  @Patch('admin/provinces/:id')
  updateProvince(@Param('id') id: string, @Body() dto: UpdateProvinceDto) {
    return this.masterData.updateProvince(id, dto);
  }
  @UseGuards(AdminAuthGuard)
  @Delete('admin/provinces/:id')
  deleteProvince(@Param('id') id: string) {
    return this.masterData.deleteProvince(id);
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/provinces/:id/districts')
  createDistrict(@Param('id') provinceId: string, @Body() dto: CreateDistrictDto) {
    return this.masterData.createDistrict(provinceId, dto);
  }
  @UseGuards(AdminAuthGuard)
  @Patch('admin/districts/:id')
  updateDistrict(@Param('id') id: string, @Body() dto: UpdateDistrictDto) {
    return this.masterData.updateDistrict(id, dto);
  }
  @UseGuards(AdminAuthGuard)
  @Delete('admin/districts/:id')
  deleteDistrict(@Param('id') id: string) {
    return this.masterData.deleteDistrict(id);
  }
}
