import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { InviteStaffDto, UpdateStaffDto } from './dto/staff.dto';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';
import { diffFields, summarizeChanges } from '../restaurant-activity-log/diff-fields';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: RestaurantActivityLogService,
  ) {}

  list(restaurantId: string) {
    return this.prisma.db.partnerStaffUser.findMany({
      where: { restaurantId },
      select: publicSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  async invite(restaurantId: string, dto: InviteStaffDto, user: PartnerJwtPayload) {
    const existing = await this.prisma.db.partnerStaffUser.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) throw new ConflictException('A staff account with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const staff = await this.prisma.db.partnerStaffUser.create({
      data: { restaurantId, email: dto.email, passwordHash, fullName: dto.fullName, role: dto.role },
      select: publicSelect,
    });
    await this.activityLog.log({
      restaurantId,
      section: 'settings',
      summary: `Invited staff member '${staff.fullName}' (${staff.role})`,
      user,
    });
    return staff;
  }

  async update(restaurantId: string, id: string, dto: UpdateStaffDto, user: PartnerJwtPayload) {
    const before = await this.ensureBelongsToRestaurant(restaurantId, id);
    const after = await this.prisma.db.partnerStaffUser.update({
      where: { id },
      data: { fullName: dto.fullName, role: dto.role, isActive: dto.isActive },
      select: publicSelect,
    });
    const changes = diffFields(
      { fullName: before.fullName, role: before.role, isActive: before.isActive },
      { fullName: after.fullName, role: after.role, isActive: after.isActive },
      { fullName: 'Name', role: 'Role', isActive: 'Active' },
    );
    if (changes.length) {
      await this.activityLog.log({ restaurantId, section: 'settings', summary: `Staff '${after.fullName}' — ${summarizeChanges(changes)}`, changes, user });
    }
    return after;
  }

  async remove(restaurantId: string, id: string, user: PartnerJwtPayload) {
    const staff = await this.ensureBelongsToRestaurant(restaurantId, id);
    await this.prisma.db.partnerStaffUser.delete({ where: { id } });
    await this.activityLog.log({ restaurantId, section: 'settings', summary: `Removed staff member '${staff.fullName}'`, user });
    return { id };
  }

  private async ensureBelongsToRestaurant(restaurantId: string, id: string) {
    const staff = await this.prisma.db.partnerStaffUser.findUnique({
      where: { id },
      select: { restaurantId: true, fullName: true, role: true, isActive: true },
    });
    if (!staff || staff.restaurantId !== restaurantId) throw new NotFoundException('Staff member not found');
    return staff;
  }
}
