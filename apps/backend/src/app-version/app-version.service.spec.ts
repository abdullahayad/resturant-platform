import { NotFoundException } from '@nestjs/common';
import { AppVersionService } from './app-version.service';

describe('AppVersionService', () => {
  const prisma = { db: { appSetting: { findUnique: jest.fn(), upsert: jest.fn() } } };
  const service = new AppVersionService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('is off for both apps until the admin sets a version', async () => {
    prisma.db.appSetting.findUnique.mockResolvedValueOnce(null);
    await expect(service.forApp('partner')).resolves.toEqual({
      minVersion: null,
      mode: 'force',
      androidUrl: 'https://play.google.com/store/apps/details?id=com.ligeta.partner',
      iosUrl: null,
    });
  });

  it("returns each app's own rule", async () => {
    prisma.db.appSetting.findUnique.mockResolvedValueOnce({
      value: { customer: { minVersion: '1.5.0', mode: 'soft', iosUrl: 'https://apps.apple.com/app/id1' } },
    });
    await expect(service.forApp('customer')).resolves.toMatchObject({
      minVersion: '1.5.0',
      mode: 'soft',
      androidUrl: 'https://play.google.com/store/apps/details?id=com.ligeta.app',
      iosUrl: 'https://apps.apple.com/app/id1',
    });
  });

  it('saves empty fields as off', async () => {
    const saved = await service.update({
      customer: { minVersion: '', mode: 'force', iosUrl: '' },
      partner: { minVersion: '1.2.0', mode: 'force' },
    });
    expect(saved.customer).toEqual({ minVersion: null, mode: 'force', iosUrl: null });
    expect(saved.partner.minVersion).toBe('1.2.0');
  });

  it('rejects an unknown app name', async () => {
    await expect(service.forApp('other')).rejects.toThrow(NotFoundException);
  });
});
