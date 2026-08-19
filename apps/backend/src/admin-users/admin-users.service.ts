import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';

const publicSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.db.adminUser.findMany({ select: publicSelect, orderBy: { createdAt: 'asc' } });
  }

  async create(dto: CreateAdminUserDto) {
    const existing = await this.prisma.db.adminUser.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) throw new ConflictException('An admin with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.db.adminUser.create({
      data: { email: dto.email, passwordHash, fullName: dto.fullName, role: dto.role },
      select: publicSelect,
    });
  }

  async update(id: string, dto: UpdateAdminUserDto, actingAdminId: string) {
    const target = await this.prisma.db.adminUser.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Admin not found');

    if (id === actingAdminId && (dto.isActive === false || dto.role === 'MODERATOR')) {
      throw new BadRequestException('You cannot deactivate or demote your own account');
    }

    const losingSuperAdminStatus =
      target.role === 'SUPER_ADMIN' &&
      target.isActive &&
      (dto.isActive === false || dto.role === 'MODERATOR');
    if (losingSuperAdminStatus) {
      const otherActiveSuperAdmins = await this.prisma.db.adminUser.count({
        where: { role: 'SUPER_ADMIN', isActive: true, id: { not: id } },
      });
      if (otherActiveSuperAdmins === 0) {
        throw new BadRequestException('Cannot remove the last active super admin');
      }
    }

    return this.prisma.db.adminUser.update({
      where: { id },
      data: { fullName: dto.fullName, role: dto.role, isActive: dto.isActive },
      select: publicSelect,
    });
  }
}
