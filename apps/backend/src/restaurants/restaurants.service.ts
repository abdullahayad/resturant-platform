import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterRestaurantDto } from './dto/register-restaurant.dto';
import type { UpdateRestaurantProfileDto } from './dto/update-restaurant-profile.dto';

const restaurantListSelect = {
  id: true,
  codeNumber: true,
  nameEn: true,
  nameAr: true,
  phone: true,
  logoUrl: true,
  status: true,
  ownerEmail: true,
  createdAt: true,
  reviewedAt: true,
  rejectionReason: true,
  province: { select: { id: true, nameEn: true, nameAr: true } },
  district: { select: { id: true, nameEn: true, nameAr: true } },
} as const;

const restaurantDetailSelect = {
  ...restaurantListSelect,
  latitude: true,
  longitude: true,
  businessTypes: { select: { businessType: true } },
  foodCategories: { select: { foodCategory: true } },
  facilities: { select: { facility: true } },
} as const;

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = `#IRQ-${Math.floor(10000 + Math.random() * 90000)}`;
      const existing = await this.prisma.db.restaurant.findUnique({
        where: { codeNumber: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
    }
    throw new ConflictException('Could not generate a unique restaurant code, try again');
  }

  async register(dto: RegisterRestaurantDto) {
    const existingOwner = await this.prisma.db.restaurant.findUnique({
      where: { ownerEmail: dto.ownerEmail },
      select: { id: true },
    });
    if (existingOwner) {
      throw new ConflictException('An account with this email already exists');
    }

    const codeNumber = await this.generateUniqueCode();
    const ownerPasswordHash = await bcrypt.hash(dto.ownerPassword, 10);

    return this.prisma.db.restaurant.create({
      data: {
        codeNumber,
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        phone: dto.phone,
        ownerEmail: dto.ownerEmail,
        ownerPasswordHash,
        provinceId: dto.provinceId,
        districtId: dto.districtId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        businessTypes: { create: dto.businessTypeIds.map((businessTypeId) => ({ businessTypeId })) },
        foodCategories: { create: dto.foodCategoryIds.map((foodCategoryId) => ({ foodCategoryId })) },
        facilities: { create: (dto.facilityIds ?? []).map((facilityId) => ({ facilityId })) },
      },
      select: restaurantDetailSelect,
    });
  }

  list(status?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED') {
    return this.prisma.db.restaurant.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      select: restaurantListSelect,
    });
  }

  async findOne(id: string) {
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { id },
      select: restaurantDetailSelect,
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async approve(id: string) {
    await this.ensureExists(id);
    return this.prisma.db.restaurant.update({
      where: { id },
      data: { status: 'APPROVED', reviewedAt: new Date(), rejectionReason: null },
      select: restaurantListSelect,
    });
  }

  async reject(id: string, reason?: string) {
    await this.ensureExists(id);
    return this.prisma.db.restaurant.update({
      where: { id },
      data: { status: 'REJECTED', reviewedAt: new Date(), rejectionReason: reason ?? null },
      select: restaurantListSelect,
    });
  }

  async suspend(id: string) {
    await this.ensureExists(id);
    return this.prisma.db.restaurant.update({
      where: { id },
      data: { status: 'SUSPENDED', reviewedAt: new Date() },
      select: restaurantListSelect,
    });
  }

  async updateProfile(id: string, dto: UpdateRestaurantProfileDto) {
    await this.ensureExists(id);

    await this.prisma.db.restaurant.update({
      where: { id },
      data: {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        phone: dto.phone,
        provinceId: dto.provinceId,
        districtId: dto.districtId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        logoUrl: dto.logoUrl,
      },
    });

    if (dto.businessTypeIds) {
      await this.prisma.db.restaurantBusinessType.deleteMany({ where: { restaurantId: id } });
      await this.prisma.db.restaurantBusinessType.createMany({
        data: dto.businessTypeIds.map((businessTypeId) => ({ restaurantId: id, businessTypeId })),
      });
    }

    if (dto.foodCategoryIds) {
      await this.prisma.db.restaurantFoodCategory.deleteMany({ where: { restaurantId: id } });
      await this.prisma.db.restaurantFoodCategory.createMany({
        data: dto.foodCategoryIds.map((foodCategoryId) => ({ restaurantId: id, foodCategoryId })),
      });
    }

    if (dto.facilityIds) {
      await this.prisma.db.restaurantFacility.deleteMany({ where: { restaurantId: id } });
      await this.prisma.db.restaurantFacility.createMany({
        data: dto.facilityIds.map((facilityId) => ({ restaurantId: id, facilityId })),
      });
    }

    return this.findOne(id);
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.db.restaurant.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Restaurant not found');
  }
}
