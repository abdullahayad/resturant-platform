import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsUrl, Matches, ValidateIf, ValidateNested } from 'class-validator';

export const APPS = ['customer', 'partner'] as const;
export type AppName = (typeof APPS)[number];
export const UPDATE_MODES = ['force', 'soft'] as const;

export class AppUpdateRuleDto {
  // Phones on an older version see the update screen. null = nobody.
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @Matches(/^\d+\.\d+\.\d+$/, { message: 'Version must look like 1.4.0' })
  minVersion?: string | null;

  // force: no way past the screen. soft: a "Later" link.
  @IsIn(UPDATE_MODES)
  mode: (typeof UPDATE_MODES)[number];

  // The App Store page, once the iPhone app is published.
  @IsOptional()
  @ValidateIf((_o, v) => v !== null && v !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true })
  iosUrl?: string | null;
}

// Admin > App > App updates.
export class AppVersionSettingsDto {
  @ValidateNested()
  @Type(() => AppUpdateRuleDto)
  customer: AppUpdateRuleDto;

  @ValidateNested()
  @Type(() => AppUpdateRuleDto)
  partner: AppUpdateRuleDto;
}
