import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMasterDataItemDto, UpdateMasterDataItemDto } from './dto/master-data-item.dto';
import type {
  CreateDistrictDto,
  CreateProvinceDto,
  UpdateDistrictDto,
  UpdateProvinceDto,
} from './dto/province-district.dto';

// Business types, food categories, menu categories, and facilities are
// simple admin-managed lists with the same shape (facilities alone add
// an optional `icon`). Shared here rather than four near-identical modules.
type SimpleListDelegate = {
  findMany: (args: unknown) => Promise<unknown>;
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
  findUnique: (args: { where: { id: string } }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

// These six lists are read on nearly every partner-app screen (they back
// every category/facility/city picker) but change maybe a few times a year —
// an admin adding a new food category is a rare, deliberate action, not
// something anyone needs reflected instantly. Holding the last answer in
// memory for a few minutes cuts that repeated database load with the only
// cost being a short delay before a brand-new admin-added item shows up
// everywhere. Admin's own management screens are unaffected — they call the
// separate, uncached listAll()-backed methods below, so an admin always sees
// their own edit immediately.
const READ_CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class MasterDataService {
  private readonly readCache = new Map<string, CacheEntry<unknown>>();

  constructor(private readonly prisma: PrismaService) {}

  private async cached<T>(key: string, fetch: () => Promise<T>): Promise<T> {
    const hit = this.readCache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as T;
    const value = await fetch();
    this.readCache.set(key, { value, expiresAt: Date.now() + READ_CACHE_TTL_MS });
    return value;
  }

  // ── public reads (active items only — used by the partner app's pickers) ──
  businessTypes() {
    return this.cached('businessTypes', () => this.listActive(this.prisma.db.businessType));
  }
  foodCategories() {
    return this.cached('foodCategories', () => this.listActive(this.prisma.db.foodCategory));
  }
  menuCategories() {
    return this.cached('menuCategories', () => this.listActive(this.prisma.db.menuCategory));
  }
  facilities() {
    return this.cached('facilities', () => this.listActive(this.prisma.db.facility));
  }
  eventTypes() {
    return this.cached('eventTypes', () => this.listActive(this.prisma.db.eventType));
  }
  provinces() {
    return this.cached('provinces', () =>
      this.prisma.db.province.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { districts: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
      }),
    );
  }

  // ── admin reads (everything, including inactive) + CRUD ──────────────
  allBusinessTypes() {
    return this.listAll(this.prisma.db.businessType);
  }
  createBusinessType(dto: CreateMasterDataItemDto) {
    return this.create(this.prisma.db.businessType, dto);
  }
  updateBusinessType(id: string, dto: UpdateMasterDataItemDto) {
    return this.update(this.prisma.db.businessType, id, dto);
  }
  deleteBusinessType(id: string) {
    return this.remove(this.prisma.db.businessType, id);
  }

  allFoodCategories() {
    return this.listAll(this.prisma.db.foodCategory);
  }
  createFoodCategory(dto: CreateMasterDataItemDto) {
    return this.create(this.prisma.db.foodCategory, dto);
  }
  updateFoodCategory(id: string, dto: UpdateMasterDataItemDto) {
    return this.update(this.prisma.db.foodCategory, id, dto);
  }
  deleteFoodCategory(id: string) {
    return this.remove(this.prisma.db.foodCategory, id);
  }

  allMenuCategories() {
    return this.listAll(this.prisma.db.menuCategory);
  }
  createMenuCategory(dto: CreateMasterDataItemDto) {
    return this.create(this.prisma.db.menuCategory, dto);
  }
  updateMenuCategory(id: string, dto: UpdateMasterDataItemDto) {
    return this.update(this.prisma.db.menuCategory, id, dto);
  }
  deleteMenuCategory(id: string) {
    return this.remove(this.prisma.db.menuCategory, id);
  }

  allFacilities() {
    return this.listAll(this.prisma.db.facility);
  }
  createFacility(dto: CreateMasterDataItemDto) {
    return this.create(this.prisma.db.facility, dto);
  }
  updateFacility(id: string, dto: UpdateMasterDataItemDto) {
    return this.update(this.prisma.db.facility, id, dto);
  }
  deleteFacility(id: string) {
    return this.remove(this.prisma.db.facility, id);
  }

  allEventTypes() {
    return this.listAll(this.prisma.db.eventType);
  }
  createEventType(dto: CreateMasterDataItemDto) {
    return this.create(this.prisma.db.eventType, dto);
  }
  updateEventType(id: string, dto: UpdateMasterDataItemDto) {
    return this.update(this.prisma.db.eventType, id, dto);
  }
  deleteEventType(id: string) {
    return this.remove(this.prisma.db.eventType, id);
  }

  allProvinces() {
    return this.prisma.db.province.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { districts: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  createProvince(dto: CreateProvinceDto) {
    return this.prisma.db.province.create({
      data: { nameEn: dto.nameEn, nameAr: dto.nameAr, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async updateProvince(id: string, dto: UpdateProvinceDto) {
    await this.ensureExists(this.prisma.db.province, id);
    return this.prisma.db.province.update({ where: { id }, data: dto });
  }

  async deleteProvince(id: string) {
    await this.ensureExists(this.prisma.db.province, id);
    await this.prisma.db.province.delete({ where: { id } });
    return { id };
  }

  async createDistrict(provinceId: string, dto: CreateDistrictDto) {
    await this.ensureExists(this.prisma.db.province, provinceId);
    return this.prisma.db.district.create({
      data: { provinceId, nameEn: dto.nameEn, nameAr: dto.nameAr, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async updateDistrict(id: string, dto: UpdateDistrictDto) {
    await this.ensureExists(this.prisma.db.district, id);
    return this.prisma.db.district.update({ where: { id }, data: dto });
  }

  async deleteDistrict(id: string) {
    await this.ensureExists(this.prisma.db.district, id);
    await this.prisma.db.district.delete({ where: { id } });
    return { id };
  }

  // ── shared helpers for the four flat lists ──────────────────────────
  private listActive(delegate: SimpleListDelegate) {
    return delegate.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }

  private listAll(delegate: SimpleListDelegate) {
    return delegate.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  private create(delegate: SimpleListDelegate, dto: CreateMasterDataItemDto) {
    return delegate.create({
      data: {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        sortOrder: dto.sortOrder ?? 0,
        ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
      },
    });
  }

  private async update(delegate: SimpleListDelegate, id: string, dto: UpdateMasterDataItemDto) {
    await this.ensureExists(delegate, id);
    return delegate.update({ where: { id }, data: { ...dto } });
  }

  private async remove(delegate: SimpleListDelegate, id: string) {
    await this.ensureExists(delegate, id);
    await delegate.delete({ where: { id } });
    return { id };
  }

  private async ensureExists(
    delegate: { findUnique: (args: { where: { id: string } }) => Promise<unknown> },
    id: string,
  ) {
    const found = await delegate.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Not found');
  }
}
