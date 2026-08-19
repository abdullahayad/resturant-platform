import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';

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

  async partnerLogin(dto: LoginDto) {
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { ownerEmail: dto.email },
    });
    const passwordMatches = await bcrypt.compare(
      dto.password,
      restaurant?.ownerPasswordHash ?? DUMMY_HASH,
    );
    if (!restaurant || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwt.signAsync({
      sub: restaurant.id,
      type: 'partner',
      restaurantStatus: restaurant.status,
      tokenVersion: restaurant.tokenVersion,
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
