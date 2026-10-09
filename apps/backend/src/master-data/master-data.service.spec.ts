import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MasterDataService } from './master-data.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MasterDataService', () => {
  let service: MasterDataService;
  let prisma: { db: Record<string, Record<string, jest.Mock>> };

  beforeEach(async () => {
    prisma = {
      db: {
        province: { findUnique: jest.fn() },
        zone: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
        district: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      },
    };

    const module = await Test.createTestingModule({
      providers: [MasterDataService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(MasterDataService);
  });

  describe('createDistrict (no zone)', () => {
    it('rejects a code already used by another zoneless district in the same province', async () => {
      prisma.db.province.findUnique.mockResolvedValueOnce({ id: 'p1' });
      prisma.db.district.findFirst.mockResolvedValueOnce({ id: 'existing' });

      await expect(
        service.createDistrict('p1', { nameEn: 'Test', nameAr: 'تجربة', code: 'z' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.db.district.create).not.toHaveBeenCalled();
      expect(prisma.db.district.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ provinceId: 'p1', zoneId: null, code: 'Z' }) }),
      );
    });

    it('creates the district, uppercasing the code, once it is free', async () => {
      prisma.db.province.findUnique.mockResolvedValueOnce({ id: 'p1' });
      prisma.db.district.findFirst.mockResolvedValueOnce(null);
      prisma.db.district.create.mockResolvedValueOnce({ id: 'd1', code: 'Z' });

      await service.createDistrict('p1', { nameEn: 'Zubair', nameAr: 'الزبير', code: 'z' });

      expect(prisma.db.district.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ code: 'Z' }) }),
      );
    });
  });

  describe('createDistrictForZone', () => {
    it('lets two different zones in the same province reuse the same district letter', async () => {
      prisma.db.zone.findUnique.mockResolvedValueOnce({ provinceId: 'p1' });
      // The one existing conflict check only looks inside this zone, not
      // the whole province - a district with the same code sitting in a
      // *different* zone of the same province must not block this.
      prisma.db.district.findFirst.mockResolvedValueOnce(null);
      prisma.db.district.create.mockResolvedValueOnce({ id: 'd2', code: 'M' });

      await service.createDistrictForZone('zoneKarkh', { nameEn: 'Mansour', nameAr: 'المنصور', code: 'm' });

      expect(prisma.db.district.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { provinceId: 'p1', zoneId: 'zoneKarkh', code: 'M' } }),
      );
    });

    it('rejects a code already used by another district in the same zone', async () => {
      prisma.db.zone.findUnique.mockResolvedValueOnce({ provinceId: 'p1' });
      prisma.db.district.findFirst.mockResolvedValueOnce({ id: 'existing' });

      await expect(
        service.createDistrictForZone('zoneKarkh', { nameEn: 'Mansour', nameAr: 'المنصور', code: 'm' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for a missing zone', async () => {
      prisma.db.zone.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.createDistrictForZone('missing', { nameEn: 'X', nameAr: 'س', code: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDistrict', () => {
    it('checks the code against the district\'s current zone when zoneId is not part of the update', async () => {
      prisma.db.district.findUnique.mockResolvedValueOnce({ id: 'd1', provinceId: 'p1', zoneId: 'zoneKarkh' });
      prisma.db.district.findFirst.mockResolvedValueOnce(null);
      prisma.db.district.update.mockResolvedValueOnce({ id: 'd1', code: 'Y' });

      await service.updateDistrict('d1', { code: 'y' });

      expect(prisma.db.district.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { provinceId: 'p1', zoneId: 'zoneKarkh', code: 'Y', id: { not: 'd1' } } }),
      );
    });

    it('checks the code against the newly-assigned zone when moving the district', async () => {
      prisma.db.district.findUnique.mockResolvedValueOnce({ id: 'd1', provinceId: 'p1', zoneId: null });
      prisma.db.zone.findUnique.mockResolvedValueOnce({ provinceId: 'p1' });
      prisma.db.district.findFirst.mockResolvedValueOnce(null);
      prisma.db.district.update.mockResolvedValueOnce({ id: 'd1', code: 'Y' });

      await service.updateDistrict('d1', { code: 'y', zoneId: 'zoneRusafa' });

      expect(prisma.db.district.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { provinceId: 'p1', zoneId: 'zoneRusafa', code: 'Y', id: { not: 'd1' } } }),
      );
    });

    it('excludes itself from the conflict check, so resubmitting the same code is fine', async () => {
      prisma.db.district.findUnique.mockResolvedValueOnce({ id: 'd1', provinceId: 'p1', zoneId: null });
      prisma.db.district.findFirst.mockResolvedValueOnce(null);
      prisma.db.district.update.mockResolvedValueOnce({ id: 'd1', code: 'Z' });

      await service.updateDistrict('d1', { code: 'z' });

      expect(prisma.db.district.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: { not: 'd1' } }) }),
      );
    });
  });

  describe('createZone / updateZone', () => {
    it('uppercases a new zone code', async () => {
      prisma.db.province.findUnique.mockResolvedValueOnce({ id: 'p1' });
      prisma.db.zone.create.mockResolvedValueOnce({ id: 'z1', code: 'R' });

      await service.createZone('p1', { nameEn: 'Rusafa', nameAr: 'الرصافة', code: 'r' });

      expect(prisma.db.zone.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ code: 'R' }) }),
      );
    });

    it('uppercases an updated zone code', async () => {
      prisma.db.zone.findUnique.mockResolvedValueOnce({ id: 'z1' });
      prisma.db.zone.update.mockResolvedValueOnce({ id: 'z1', code: 'K' });

      await service.updateZone('z1', { code: 'k' });

      expect(prisma.db.zone.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ code: 'K' }) }),
      );
    });
  });
});
