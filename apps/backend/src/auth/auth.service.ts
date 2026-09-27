import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { Restaurant, PartnerStaffUser } from '../../generated/prisma/client';
import { buildOtpauthUrl, generateBase32Secret, verifyTotp } from '../common/totp';

const TWO_FACTOR_PENDING_TYPE = 'admin-2fa-pending';

interface TwoFactorPendingPayload {
  sub: string;
  type: typeof TWO_FACTOR_PENDING_TYPE;
}

// A precomputed hash with no matching plaintext, compared against on the
// "account not found" path so failed logins take the same time whether or
// not the email exists — otherwise bcrypt only running for real accounts
// leaks account existence via response timing.
const DUMMY_HASH = bcrypt.hashSync('no-such-account-timing-safety', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // The partner app has one sign-in form shared by the restaurant owner and
  // invited staff, so this tries the owner account first and falls back to
  // a staff account on the same email — a single request either way, rather
  // than the frontend probing two endpoints and logging a guaranteed-first-
  // failure on every staff login.
  async partnerLogin(dto: LoginDto) {
    const restaurant = await this.prisma.db.restaurant.findUnique({ where: { ownerEmail: dto.email } });
    const ownerPasswordMatches = await bcrypt.compare(dto.password, restaurant?.ownerPasswordHash ?? DUMMY_HASH);
    if (restaurant && ownerPasswordMatches) {
      return this.buildPartnerLoginResult(restaurant);
    }
    return this.staffLogin(dto);
  }

  async staffLogin(dto: LoginDto) {
    const staff = await this.prisma.db.partnerStaffUser.findUnique({ where: { email: dto.email } });
    const passwordMatches = await bcrypt.compare(dto.password, staff?.passwordHash ?? DUMMY_HASH);
    if (!staff || !staff.isActive || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const restaurant = await this.prisma.db.restaurant.findUnique({ where: { id: staff.restaurantId } });
    if (!restaurant) throw new UnauthorizedException('Invalid email or password');

    return this.buildPartnerLoginResult(restaurant, staff);
  }

  private async buildPartnerLoginResult(restaurant: Restaurant, staff?: PartnerStaffUser) {
    const accessToken = await this.jwt.signAsync({
      sub: restaurant.id,
      type: 'partner',
      restaurantStatus: restaurant.status,
      // A staff login's tokenVersion tracks the staff row's own version
      // (bumped when they change their password), not the restaurant's —
      // otherwise the owner changing their password would also invalidate
      // every staff member's session, and vice versa.
      tokenVersion: staff ? staff.tokenVersion : restaurant.tokenVersion,
      staffId: staff?.id,
      staffRole: staff?.role,
    });

    return {
      accessToken,
      restaurant: {
        id: restaurant.id,
        codeNumber: restaurant.codeNumber,
        nameEn: restaurant.nameEn,
        nameAr: restaurant.nameAr,
        status: restaurant.status,
        rejectionReason: restaurant.rejectionReason,
      },
      staff: staff ? { id: staff.id, fullName: staff.fullName, role: staff.role } : undefined,
    };
  }

  async adminLogin(dto: LoginDto) {
    const admin = await this.prisma.db.adminUser.findUnique({ where: { email: dto.email } });
    const passwordMatches = await bcrypt.compare(dto.password, admin?.passwordHash ?? DUMMY_HASH);
    if (!admin || !admin.isActive || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Password alone isn't enough for a 2FA-enabled admin - hand back a
    // short-lived pending token (never a real session, never a cookie) that
    // only completeAdminTwoFactor() can exchange for one, and only with a
    // valid TOTP code alongside it.
    if (admin.twoFactorEnabled) {
      const pendingToken = await this.jwt.signAsync(
        { sub: admin.id, type: TWO_FACTOR_PENDING_TYPE } satisfies TwoFactorPendingPayload,
        { expiresIn: '5m' },
      );
      return { twoFactorRequired: true as const, pendingToken };
    }

    return this.finishAdminLogin(admin);
  }

  async completeAdminTwoFactor(pendingToken: string, code: string) {
    let payload: TwoFactorPendingPayload;
    try {
      payload = await this.jwt.verifyAsync<TwoFactorPendingPayload>(pendingToken);
    } catch {
      throw new UnauthorizedException('This sign-in attempt has expired, please sign in again');
    }
    if (payload.type !== TWO_FACTOR_PENDING_TYPE) {
      throw new UnauthorizedException('This sign-in attempt has expired, please sign in again');
    }

    const admin = await this.prisma.db.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.isActive || !admin.twoFactorEnabled || !admin.twoFactorSecret) {
      throw new UnauthorizedException('This sign-in attempt has expired, please sign in again');
    }
    if (!verifyTotp(admin.twoFactorSecret, code)) {
      throw new UnauthorizedException('Invalid code');
    }

    return this.finishAdminLogin(admin);
  }

  private async finishAdminLogin(admin: {
    id: string;
    role: string;
    tokenVersion: number;
    fullName: string;
    email: string;
    twoFactorEnabled: boolean;
  }) {
    const accessToken = await this.jwt.signAsync({
      sub: admin.id,
      type: 'admin',
      adminRole: admin.role,
      tokenVersion: admin.tokenVersion,
    });

    return {
      accessToken,
      admin: {
        id: admin.id,
        fullName: admin.fullName,
        role: admin.role,
        email: admin.email,
        twoFactorEnabled: admin.twoFactorEnabled,
      },
    };
  }

  // Generates a fresh secret and stores it, but leaves twoFactorEnabled
  // false - it only takes effect once enableTwoFactor() confirms the admin
  // can actually generate a matching code with it (see the schema comment).
  async startTwoFactorSetup(adminId: string) {
    const admin = await this.prisma.db.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    const secret = generateBase32Secret();
    await this.prisma.db.adminUser.update({ where: { id: adminId }, data: { twoFactorSecret: secret } });
    return { secret, otpauthUrl: buildOtpauthUrl(admin.email, secret) };
  }

  async enableTwoFactor(adminId: string, code: string) {
    const admin = await this.prisma.db.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    if (!admin.twoFactorSecret) {
      throw new BadRequestException('Start setup first before confirming a code');
    }
    if (!verifyTotp(admin.twoFactorSecret, code)) {
      throw new UnauthorizedException('Invalid code');
    }
    await this.prisma.db.adminUser.update({ where: { id: adminId }, data: { twoFactorEnabled: true } });
  }

  async disableTwoFactor(adminId: string, code: string) {
    const admin = await this.prisma.db.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    if (!admin.twoFactorEnabled || !admin.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }
    if (!verifyTotp(admin.twoFactorSecret, code)) {
      throw new UnauthorizedException('Invalid code');
    }
    await this.prisma.db.adminUser.update({
      where: { id: adminId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
  }
}
