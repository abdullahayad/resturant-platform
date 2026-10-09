import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const MAX_SORT_ORDER = 100_000;
// Case-insensitive at the API boundary — the service uppercases before
// saving, so an admin typing "bagh" doesn't get a confusing validation error.
const PROVINCE_CODE_PATTERN = /^[A-Za-z]{2}$/;
const SHORT_CODE_PATTERN = /^[A-Za-z]{1}$/;

export class CreateProvinceDto {
  @IsString()
  @MaxLength(200)
  nameEn: string;

  @IsString()
  @MaxLength(200)
  nameAr: string;

  // First segment of every restaurant code in this province, e.g. "BG" for
  // Baghdad -> BGKM001.
  @IsString()
  @Matches(PROVINCE_CODE_PATTERN, { message: 'code must be exactly 2 letters' })
  code: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_SORT_ORDER)
  sortOrder?: number;
}

export class UpdateProvinceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameAr?: string;

  @IsOptional()
  @IsString()
  @Matches(PROVINCE_CODE_PATTERN, { message: 'code must be exactly 2 letters' })
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_SORT_ORDER)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateDistrictDto {
  @IsString()
  @MaxLength(200)
  nameEn: string;

  @IsString()
  @MaxLength(200)
  nameAr: string;

  // Last segment of every restaurant code for this district, e.g. "M" for
  // Mansour -> BGKM001. Only needs to be unique within its own zone (or
  // province, if it has no zone) — MasterDataService enforces this, not a
  // DB constraint, see District.code's comment in schema.prisma.
  @IsString()
  @Matches(SHORT_CODE_PATTERN, { message: 'code must be exactly 1 letter' })
  code: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_SORT_ORDER)
  sortOrder?: number;
}

export class UpdateDistrictDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameAr?: string;

  @IsOptional()
  @IsString()
  @Matches(SHORT_CODE_PATTERN, { message: 'code must be exactly 1 letter' })
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_SORT_ORDER)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Moves this district to a different zone, or (passing null) detaches it
  // back to sitting directly under its province with no zone. Must already
  // belong to the same province as the zone - the service checks this,
  // since this field alone can't express that constraint.
  @ValidateIf((dto: UpdateDistrictDto) => dto.zoneId !== null)
  @IsOptional()
  @IsUUID()
  zoneId?: string | null;
}

// A zone's own code is the restaurant code's middle segment, between its
// province and district letters (e.g. "BG" + "K" + "M" -> BGKM) - only
// meaningful for provinces that actually use zones (Baghdad today).
export class CreateZoneDto {
  @IsString()
  @MaxLength(200)
  nameEn: string;

  @IsString()
  @MaxLength(200)
  nameAr: string;

  @IsString()
  @Matches(SHORT_CODE_PATTERN, { message: 'code must be exactly 1 letter' })
  code: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_SORT_ORDER)
  sortOrder?: number;
}

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameAr?: string;

  @IsOptional()
  @IsString()
  @Matches(SHORT_CODE_PATTERN, { message: 'code must be exactly 1 letter' })
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_SORT_ORDER)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
