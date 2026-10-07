import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertChefProfileDto } from './dto/chef-profile.dto';
import type { UpdateCrewDto } from './dto/crew.dto';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';
import { diffFields, summarizeChanges } from '../restaurant-activity-log/diff-fields';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

type ChefRole = 'HEAD_CHEF' | 'SOUS_CHEF';
const ROLE_LABELS: Record<ChefRole, string> = { HEAD_CHEF: 'Chef', SOUS_CHEF: 'Sous-Chef' };

const signatureDishesInclude = {
  signatureDishes: { include: { dish: { select: { id: true, nameEn: true, nameAr: true, photoUrl: true } } } },
} as const;

@Injectable()
export class ChefsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: RestaurantActivityLogService,
  ) {}

  async get(restaurantId: string) {
    const [profiles, restaurant] = await Promise.all([
      this.prisma.db.chefProfile.findMany({ where: { restaurantId }, include: signatureDishesInclude }),
      this.prisma.db.restaurant.findUnique({
        where: { id: restaurantId },
        select: { crewCount: true, crewPhotoUrl: true },
      }),
    ]);
    return {
      headChef: profiles.find((p) => p.role === 'HEAD_CHEF') ?? null,
      sousChef: profiles.find((p) => p.role === 'SOUS_CHEF') ?? null,
      crewCount: restaurant?.crewCount ?? null,
      crewPhotoUrl: restaurant?.crewPhotoUrl ?? null,
    };
  }

  async upsertProfile(restaurantId: string, role: ChefRole, dto: UpsertChefProfileDto, user: PartnerJwtPayload) {
    if (dto.signatureDishIds && dto.signatureDishIds.length > 0) {
      await this.assertDishesBelongToRestaurant(restaurantId, dto.signatureDishIds);
    }
    const before = await this.prisma.db.chefProfile.findUnique({
      where: { restaurantId_role: { restaurantId, role } },
    });

    // undefined leaves the existing set untouched (on update) or starts
    // empty (on create); an explicit [] clears it - deleteMany + create is
    // the same "replace the whole set" pattern promotions.service.ts uses
    // for its own dish links.
    const signatureDishesWrite = dto.signatureDishIds
      ? { create: dto.signatureDishIds.map((dishId) => ({ dishId })) }
      : undefined;

    const after = await this.prisma.db.chefProfile.upsert({
      where: { restaurantId_role: { restaurantId, role } },
      create: {
        restaurantId,
        role,
        name: dto.name,
        photoUrl: dto.photoUrl,
        speciality: dto.speciality,
        yearsExperience: dto.yearsExperience,
        awards: dto.awards ?? [],
        signatureDishes: signatureDishesWrite,
      },
      update: {
        name: dto.name,
        photoUrl: dto.photoUrl,
        speciality: dto.speciality,
        yearsExperience: dto.yearsExperience,
        awards: dto.awards ?? [],
        signatureDishes: dto.signatureDishIds ? { deleteMany: {}, ...signatureDishesWrite } : undefined,
      },
      include: signatureDishesInclude,
    });

    const roleLabel = ROLE_LABELS[role];
    if (!before) {
      await this.activityLog.log({
        restaurantId,
        section: 'chefManagement',
        summary: `Added ${roleLabel} profile — '${after.name}'`,
        user,
      });
    } else {
      const changes = diffFields(
        { name: before.name, speciality: before.speciality, yearsExperience: before.yearsExperience },
        { name: after.name, speciality: after.speciality, yearsExperience: after.yearsExperience },
        { name: 'Name', speciality: 'Speciality', yearsExperience: 'Years Experience' },
      );
      if (changes.length) {
        await this.activityLog.log({
          restaurantId,
          section: 'chefManagement',
          summary: `${roleLabel} — ${summarizeChanges(changes)}`,
          changes,
          user,
        });
      }
    }

    return after;
  }

  private async assertDishesBelongToRestaurant(restaurantId: string, dishIds: string[]) {
    const owned = await this.prisma.db.dish.count({ where: { id: { in: dishIds }, restaurantId } });
    if (owned !== dishIds.length) {
      throw new BadRequestException('One or more selected dishes do not belong to this restaurant');
    }
  }

  async removeProfile(restaurantId: string, role: ChefRole, user: PartnerJwtPayload) {
    const profile = await this.prisma.db.chefProfile.findUnique({
      where: { restaurantId_role: { restaurantId, role } },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException('Chef profile not found');
    await this.prisma.db.chefProfile.delete({ where: { id: profile.id } });
    await this.activityLog.log({
      restaurantId,
      section: 'chefManagement',
      summary: `Removed ${ROLE_LABELS[role]} profile`,
      user,
    });
    return { id: profile.id };
  }

  async updateCrew(restaurantId: string, dto: UpdateCrewDto, user: PartnerJwtPayload) {
    const before = await this.prisma.db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { crewCount: true, crewPhotoUrl: true },
    });
    await this.prisma.db.restaurant.update({
      where: { id: restaurantId },
      data: { crewCount: dto.crewCount, crewPhotoUrl: dto.crewPhotoUrl },
    });
    const changes = diffFields(
      { crewCount: before?.crewCount ?? null, crewPhotoUrl: before?.crewPhotoUrl ?? null },
      { crewCount: dto.crewCount ?? null, crewPhotoUrl: dto.crewPhotoUrl ?? null },
      { crewCount: 'Crew Count', crewPhotoUrl: 'Crew Photo' },
    );
    if (changes.length) {
      await this.activityLog.log({
        restaurantId,
        section: 'chefManagement',
        summary: summarizeChanges(changes),
        changes,
        user,
      });
    }
    return { crewCount: dto.crewCount ?? null, crewPhotoUrl: dto.crewPhotoUrl ?? null };
  }
}
