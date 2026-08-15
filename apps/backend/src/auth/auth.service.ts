import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';

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
    if (!restaurant || !(await bcrypt.compare(dto.password, restaurant.ownerPasswordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwt.signAsync({
      sub: restaurant.id,
      type: 'partner',
      restaurantStatus: restaurant.status,
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
    if (!admin || !admin.isActive || !(await bcrypt.compare(dto.password, admin.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwt.signAsync({
      sub: admin.id,
      type: 'admin',
      adminRole: admin.role,
    });

    return {
      accessToken,
      admin: { id: admin.id, fullName: admin.fullName, role: admin.role, email: admin.email },
    };
  }
}
