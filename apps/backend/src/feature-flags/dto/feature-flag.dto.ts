import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UpdateFeatureFlagDto {
  @IsBoolean()
  defaultEnabled: boolean;
}

// Each field validates as a UUID if present, but nothing here enforces
// "exactly one of the three" — that's checked explicitly in
// FeatureFlagsService.setOverride, where a clear error message is easier to
// produce than encoding the cross-field rule into decorators here.
export class SetFeatureFlagOverrideDto {
  @IsOptional()
  @IsUUID()
  restaurantId?: string;

  @IsOptional()
  @IsUUID()
  districtId?: string;

  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @IsBoolean()
  enabled: boolean;
}
