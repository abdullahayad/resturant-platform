import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterRestaurantDto } from './dto/register-restaurant.dto';
import type { UpdateRestaurantProfileDto } from './dto/update-restaurant-profile.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { UpdateNotificationPrefsDto } from './dto/notification-prefs.dto';
import type { DayHoursDto } from './dto/opening-hours.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../email/email.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

const restaurantListSelect = {
  id: true,
  codeNumber: true,
  nameEn: true,
  nameAr: true,
  phone: true,
  logoUrl: true,
  status: true,
  statsVisible: true,
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
  notifyNewReview: true,
  notifyNewBooking: true,
  termsAcceptedAt: true,
  businessTypes: { select: { businessType: true } },
  foodCategories: { select: { foodCategory: true } },
  facilities: { select: { facility: true } },
  openingHours: { orderBy: { dayOfWeek: 'asc' } },
} as const;

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
  ) {}

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
        termsAcceptedAt: new Date(),
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

  list(filters: {
    status?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
    provinceId?: string;
    districtId?: string;
    businessTypeId?: string;
    foodCategoryId?: string;
    search?: string;
  }) {
    const search = filters.search?.trim();
    return this.prisma.db.restaurant.findMany({
      where: {
        status: filters.status,
        provinceId: filters.provinceId,
        districtId: filters.districtId,
        businessTypes: filters.businessTypeId
          ? { some: { businessTypeId: filters.businessTypeId } }
          : undefined,
        foodCategories: filters.foodCategoryId
          ? { some: { foodCategoryId: filters.foodCategoryId } }
          : undefined,
        OR: search
          ? [
              { nameEn: { contains: search, mode: 'insensitive' } },
              { nameAr: { contains: search, mode: 'insensitive' } },
              { codeNumber: { contains: search, mode: 'insensitive' } },
              { ownerEmail: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
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

  async setStatsVisibility(id: string, statsVisible: boolean) {
    await this.ensureExists(id);
    return this.prisma.db.restaurant.update({
      where: { id },
      data: { statsVisible },
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

  // "My password" means the owner's password when called by the owner, or
  // the caller's own staff password when called by a staff login — same
  // endpoint either way, branching on which kind of session this is.
  async changePassword(user: PartnerJwtPayload, dto: ChangePasswordDto) {
    if (user.staffId) {
      return this.changeStaffPassword(user.sub, user.staffId, dto);
    }
    return this.changeOwnerPassword(user.sub, dto);
  }

  private async changeOwnerPassword(id: string, dto: ChangePasswordDto) {
    const restaurant = await this.prisma.db.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const matches = await bcrypt.compare(dto.currentPassword, restaurant.ownerPasswordHash);
    if (!matches) throw new BadRequestException('Current password is incorrect');

    const ownerPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    const updated = await this.prisma.db.restaurant.update({
      where: { id },
      data: { ownerPasswordHash, tokenVersion: { increment: 1 } },
    });

    // Bumping tokenVersion invalidates every previously issued token,
    // including the one used to make this request — issue a fresh one so
    // the caller isn't immediately logged out by their own password change.
    const accessToken = await this.jwt.signAsync({
      sub: updated.id,
      type: 'partner',
      restaurantStatus: updated.status,
      tokenVersion: updated.tokenVersion,
    });
    return { success: true, accessToken };
  }

  private async changeStaffPassword(restaurantId: string, staffId: string, dto: ChangePasswordDto) {
    const staff = await this.prisma.db.partnerStaffUser.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Staff account not found');

    const matches = await bcrypt.compare(dto.currentPassword, staff.passwordHash);
    if (!matches) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    const updated = await this.prisma.db.partnerStaffUser.update({
      where: { id: staffId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });

    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { status: true },
    });

    const accessToken = await this.jwt.signAsync({
      sub: restaurantId,
      type: 'partner',
      restaurantStatus: restaurant?.status,
      tokenVersion: updated.tokenVersion,
      staffId: updated.id,
      staffRole: updated.role,
    });
    return { success: true, accessToken };
  }

  // Always returns the same generic response whether or not the email
  // matches an account — an email-enumeration endpoint would let anyone
  // probe which restaurant owner emails are registered.
  async forgotPassword(dto: ForgotPasswordDto) {
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { ownerEmail: dto.email },
      select: { id: true },
    });
    if (restaurant) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const passwordResetCodeHash = await bcrypt.hash(code, 10);
      const passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await this.prisma.db.restaurant.update({
        where: { id: restaurant.id },
        data: { passwordResetCodeHash, passwordResetExpiresAt },
      });
      await this.email.send(
        dto.email,
        'Reset your Restaurant Partner Portal password',
        `<p>Your password reset code is:</p><h1 style="letter-spacing:4px">${code}</h1><p>This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>`,
      );
    }
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const restaurant = await this.prisma.db.restaurant.findUnique({ where: { ownerEmail: dto.email } });
    const codeValid =
      restaurant?.passwordResetCodeHash &&
      restaurant.passwordResetExpiresAt &&
      restaurant.passwordResetExpiresAt > new Date() &&
      (await bcrypt.compare(dto.code, restaurant.passwordResetCodeHash));
    if (!restaurant || !codeValid) {
      throw new BadRequestException('Invalid or expired code');
    }

    const ownerPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.db.restaurant.update({
      where: { id: restaurant.id },
      data: {
        ownerPasswordHash,
        tokenVersion: { increment: 1 },
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
      },
    });
    return { success: true };
  }

  async updateNotificationPrefs(id: string, dto: UpdateNotificationPrefsDto) {
    await this.ensureExists(id);
    return this.prisma.db.restaurant.update({
      where: { id },
      data: { notifyNewReview: dto.notifyNewReview, notifyNewBooking: dto.notifyNewBooking },
      select: restaurantDetailSelect,
    });
  }

  // Upsert on the token itself (not restaurantId) so a device that logs into
  // a different restaurant account gets its token reassigned instead of
  // creating a stale duplicate row.
  async registerPushToken(restaurantId: string, token: string) {
    await this.prisma.db.restaurantPushToken.upsert({
      where: { token },
      update: { restaurantId },
      create: { restaurantId, token },
    });
    return { success: true };
  }

  async unregisterPushToken(token: string) {
    await this.prisma.db.restaurantPushToken.deleteMany({ where: { token } });
    return { success: true };
  }

  async updateOpeningHours(id: string, days: DayHoursDto[]) {
    await this.ensureExists(id);
    await this.prisma.db.openingHours.deleteMany({ where: { restaurantId: id } });
    await this.prisma.db.openingHours.createMany({
      data: days.map((d) => ({
        restaurantId: id,
        dayOfWeek: d.dayOfWeek,
        isClosed: d.isClosed,
        openTime: d.isClosed ? null : (d.openTime ?? null),
        closeTime: d.isClosed ? null : (d.closeTime ?? null),
      })),
    });
    return this.findOne(id);
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.db.restaurant.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Restaurant not found');
  }
}
