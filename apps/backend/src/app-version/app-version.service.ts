import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { APPS, type AppName, type AppVersionSettingsDto } from './app-version.dto';

const KEY = 'appVersions';

export interface AppUpdateRule {
  minVersion: string | null;
  mode: 'force' | 'soft';
  iosUrl: string | null;
}
export type AppVersionSettings = Record<AppName, AppUpdateRule>;

const ANDROID_PACKAGE: Record<AppName, string> = {
  customer: 'com.ligeta.app',
  partner: 'com.ligeta.partner',
};

const OFF: AppUpdateRule = { minVersion: null, mode: 'force', iosUrl: null };

// The "please update" screen in both apps: the admin sets the lowest
// version each app may run; anything older is sent to the store, either
// with no way past (force) or with a "Later" link (soft).
@Injectable()
export class AppVersionService {
  constructor(private readonly prisma: PrismaService) {}

  async settings(): Promise<AppVersionSettings> {
    const row = await this.prisma.db.appSetting.findUnique({ where: { key: KEY } });
    const saved = (row?.value as Partial<AppVersionSettings> | undefined) ?? {};
    return { customer: { ...OFF, ...saved.customer }, partner: { ...OFF, ...saved.partner } };
  }

  async update(dto: AppVersionSettingsDto): Promise<AppVersionSettings> {
    const clean = (r: AppVersionSettingsDto[AppName]): AppUpdateRule => ({
      minVersion: r.minVersion || null,
      mode: r.mode,
      iosUrl: r.iosUrl || null,
    });
    const value: AppVersionSettings = { customer: clean(dto.customer), partner: clean(dto.partner) };
    await this.prisma.db.appSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: value as unknown as Prisma.InputJsonValue },
      update: { value: value as unknown as Prisma.InputJsonValue },
    });
    return value;
  }

  // What one app checks when it opens. The app compares its own version.
  async forApp(app: string) {
    if (!(APPS as readonly string[]).includes(app)) throw new NotFoundException('Unknown app');
    const rule = (await this.settings())[app as AppName];
    return {
      minVersion: rule.minVersion,
      mode: rule.mode,
      androidUrl: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE[app as AppName]}`,
      iosUrl: rule.iosUrl,
    };
  }
}
