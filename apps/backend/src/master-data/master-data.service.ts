import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  businessTypes() {
    return this.prisma.db.businessType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  foodCategories() {
    return this.prisma.db.foodCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  menuCategories() {
    return this.prisma.db.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  facilities() {
    return this.prisma.db.facility.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  provinces() {
    return this.prisma.db.province.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { districts: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    });
  }
}
