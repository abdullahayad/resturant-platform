import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertChefProfileDto } from './dto/chef-profile.dto';
import type { UpdateCrewDto } from './dto/crew.dto';

type ChefRole = 'HEAD_CHEF' | 'SOUS_CHEF';

@Injectable()
export class ChefsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(restaurantId: string) {
    const [profiles, restaurant] = await Promise.all([
      this.prisma.db.chefProfile.findMany({ where: { restaurantId } }),
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

  upsertProfile(restaurantId: string, role: ChefRole, dto: UpsertChefProfileDto) {
    return this.prisma.db.chefProfile.upsert({
      where: { restaurantId_role: { restaurantId, role } },
      create: {
        restaurantId,
        role,
        name: dto.name,
        photoUrl: dto.photoUrl,
        speciality: dto.speciality,
        yearsExperience: dto.yearsExperience,
        awards: dto.awards ?? [],
      },
      update: {
        name: dto.name,
        photoUrl: dto.photoUrl,
        speciality: dto.speciality,
        yearsExperience: dto.yearsExperience,
        awards: dto.awards ?? [],
      },
    });
  }

  async removeProfile(restaurantId: string, role: ChefRole) {
    const profile = await this.prisma.db.chefProfile.findUnique({
      where: { restaurantId_role: { restaurantId, role } },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException('Chef profile not found');
    await this.prisma.db.chefProfile.delete({ where: { id: profile.id } });
    return { id: profile.id };
  }

  async updateCrew(restaurantId: string, dto: UpdateCrewDto) {
    await this.prisma.db.restaurant.update({
      where: { id: restaurantId },
      data: { crewCount: dto.crewCount, crewPhotoUrl: dto.crewPhotoUrl },
    });
    return { crewCount: dto.crewCount ?? null, crewPhotoUrl: dto.crewPhotoUrl ?? null };
  }
}
