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
import type { ModeratePublishDto } from './dto/update-restaurant-status.dto';
import { EmailService } from '../email/email.service';
import { PushService } from '../push/push.service';
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
  publishStatus: true,
  publishSubmittedAt: true,
  publishRejectionReason: true,
  publishReviewedAt: true,
  publishDeclineAcknowledgedAt: true,
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

// Everything an admin needs to see exactly what the restaurant's page will
// look like — deliberately includes HIDDEN/FLAGGED content, unlike the
// partner-app-facing "my content" queries, so completeness can be judged.
const publishReviewSelect = {
  ...restaurantDetailSelect,
  crewCount: true,
  crewPhotoUrl: true,
  publishReviewedBy: { select: { fullName: true } },
  dishes: {
    include: { menuCategory: true },
    orderBy: { createdAt: 'desc' },
  },
  galleryPhotos: {
    include: { dish: { select: { id: true, nameEn: true, isMostOrdered: true, menuCategory: true } } },
    orderBy: { createdAt: 'desc' },
  },
  chefProfiles: true,
  events: {
    include: { eventType: { select: { id: true, nameEn: true, nameAr: true, icon: true } } },
    orderBy: { createdAt: 'desc' },
  },
  // Read-only for the admin — staff themselves are still only ever
  // managed by the restaurant owner/manager (restaurants/me/staff).
  staffUsers: {
    select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  },
} as const;

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
    private readonly push: PushService,
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
    // One shared message for both fields — a distinct message per field
    // would let an anonymous caller enumerate which emails/phone numbers
    // are already registered (see security review).
    const [existingOwner, existingPhone] = await Promise.all([
      this.prisma.db.restaurant.findUnique({ where: { ownerEmail: dto.ownerEmail }, select: { id: true } }),
      this.prisma.db.restaurant.findUnique({ where: { phone: dto.phone }, select: { id: true } }),
    ]);
    if (existingOwner || existingPhone) {
      throw new ConflictException('An account with this email or phone number already exists');
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
    publishStatus?: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
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
        publishStatus: filters.publishStatus,
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

    if (dto.phone !== undefined) {
      const existingPhone = await this.prisma.db.restaurant.findUnique({
        where: { phone: dto.phone },
        select: { id: true },
      });
      if (existingPhone && existingPhone.id !== id) {
        throw new ConflictException('An account with this phone number already exists');
      }
    }

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

  // Go-live gate. Allowed from NOT_SUBMITTED (first submission) or REJECTED
  // (the restaurant edited their profile after a decline and is submitting
  // again) — resubmission after a decline no longer requires an admin to
  // reopen it first.
  async submitForPublish(id: string) {
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { id },
      select: { publishStatus: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if (restaurant.publishStatus !== 'NOT_SUBMITTED' && restaurant.publishStatus !== 'REJECTED') {
      throw new BadRequestException('This restaurant has already submitted for publish review');
    }
    await this.prisma.db.restaurant.update({
      where: { id },
      data: {
        publishStatus: 'PENDING',
        publishSubmittedAt: new Date(),
        publishRejectionReason: null,
        publishReviewedById: null,
        publishReviewedAt: null,
        publishDeclineAcknowledgedAt: null,
      },
    });
    return this.findOne(id);
  }

  async getPublishReview(id: string) {
    const restaurant = await this.prisma.db.restaurant.findUnique({ where: { id }, select: publishReviewSelect });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async moderatePublish(adminId: string, id: string, dto: ModeratePublishDto) {
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { id },
      select: { publishStatus: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if (restaurant.publishStatus !== 'PENDING') {
      throw new BadRequestException('This restaurant has no publish review pending');
    }
    const updated = await this.prisma.db.restaurant.update({
      where: { id },
      data: {
        publishStatus: dto.status,
        publishRejectionReason: dto.status === 'REJECTED' ? (dto.rejectionReason ?? null) : null,
        publishReviewedById: adminId,
        publishReviewedAt: new Date(),
        // A fresh decline is always unacknowledged, even if a previous
        // round was already marked done.
        publishDeclineAcknowledgedAt: null,
      },
      select: restaurantListSelect,
    });

    // Always sent, unlike notifyNewReview/notifyNewBooking — this is a
    // one-time account-status event the owner needs to see regardless of
    // their notification preferences, same as admin announcements.
    if (dto.status === 'APPROVED') {
      this.push
        .sendToRestaurants([id], 'Your listing is live!', 'Your publish review was approved — your listing is now live.')
        .catch(() => {});
    } else {
      const reasonText = dto.rejectionReason ? `Reason: ${dto.rejectionReason} ` : '';
      this.push
        .sendToRestaurants(
          [id],
          'Publish review declined',
          `${reasonText}Update your profile and submit again from Settings.`,
        )
        .catch(() => {});
    }

    return updated;
  }

  // Restaurant-side "Mark as Done" — the decline notice stays flagged as
  // needing attention until the restaurant explicitly dismisses it, not
  // just by viewing it.
  async acknowledgePublishDecline(id: string) {
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { id },
      select: { publishStatus: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if (restaurant.publishStatus !== 'REJECTED') {
      throw new BadRequestException('There is no declined publish review to acknowledge');
    }
    await this.prisma.db.restaurant.update({
      where: { id },
      data: { publishDeclineAcknowledgedAt: new Date() },
    });
    return this.findOne(id);
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.db.restaurant.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Restaurant not found');
  }
}
