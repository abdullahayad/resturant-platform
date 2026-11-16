import { IsBoolean, IsOptional, IsUUID, Matches, ValidateIf } from 'class-validator';

// Admin > App > Home Layout > Ramadan. Dates are Baghdad calendar days,
// set by the admin once the moon is sighted.
export class RamadanSettingsDto {
  @IsBoolean()
  enabled: boolean;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate: string;

  // The event type restaurants use for iftar buffets/menus.
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  iftarEventTypeId?: string | null;

  // The seasonal mood that lists places open for suhoor.
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  suhoorMoodId?: string | null;
}
