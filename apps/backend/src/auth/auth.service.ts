import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { Restaurant, PartnerStaffUser } from '../../generated/prisma/client';

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
      tokenVersion: restaurant.tokenVersion,
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

    const accessToken = await this.jwt.signAsync({
      sub: admin.id,
      type: 'admin',
      adminRole: admin.role,
      tokenVersion: admin.tokenVersion,
    });

    return {
      accessToken,
      admin: { id: admin.id, fullName: admin.fullName, role: admin.role, email: admin.email },
    };
  }
}
