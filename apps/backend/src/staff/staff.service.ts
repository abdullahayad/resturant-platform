import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { InviteStaffDto, UpdateStaffDto } from './dto/staff.dto';

const publicSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  list(restaurantId: string) {
    return this.prisma.db.partnerStaffUser.findMany({
      where: { restaurantId },
      select: publicSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  async invite(restaurantId: string, dto: InviteStaffDto) {
    const existing = await this.prisma.db.partnerStaffUser.findUnique({
      where: { restaurantId_email: { restaurantId, email: dto.email } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('A staff account with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.db.partnerStaffUser.create({
      data: { restaurantId, email: dto.email, passwordHash, fullName: dto.fullName, role: dto.role },
      select: publicSelect,
    });
  }

  async update(restaurantId: string, id: string, dto: UpdateStaffDto) {
    await this.ensureBelongsToRestaurant(restaurantId, id);
    return this.prisma.db.partnerStaffUser.update({
      where: { id },
      data: { fullName: dto.fullName, role: dto.role, isActive: dto.isActive },
      select: publicSelect,
    });
  }

  async remove(restaurantId: string, id: string) {
    await this.ensureBelongsToRestaurant(restaurantId, id);
    await this.prisma.db.partnerStaffUser.delete({ where: { id } });
    return { id };
  }

  private async ensureBelongsToRestaurant(restaurantId: string, id: string) {
    const staff = await this.prisma.db.partnerStaffUser.findUnique({
      where: { id },
      select: { restaurantId: true },
    });
    if (!staff || staff.restaurantId !== restaurantId) throw new NotFoundException('Staff member not found');
  }
}
