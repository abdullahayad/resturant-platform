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
const CODE_PATTERN = /^[A-Za-z]{4}$/;

export class CreateProvinceDto {
  @IsString()
  @MaxLength(200)
  nameEn: string;

  @IsString()
  @MaxLength(200)
  nameAr: string;

  // First segment of every restaurant code in this province, e.g. "BAGH" for
  // Baghdad -> BAGHKARK001.
  @IsString()
  @Matches(CODE_PATTERN, { message: 'code must be exactly 4 letters' })
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
  @Matches(CODE_PATTERN, { message: 'code must be exactly 4 letters' })
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

  // Second segment of every restaurant code in this district, e.g. "KARK" for
  // Karkh -> BAGHKARK001. Only needs to be unique within its own province —
  // the province code already disambiguates across provinces.
  @IsString()
  @Matches(CODE_PATTERN, { message: 'code must be exactly 4 letters' })
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
  @Matches(CODE_PATTERN, { message: 'code must be exactly 4 letters' })
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

// Zones carry no code of their own — they're a pure browsing/grouping layer
// (see the Zone model's own comment), never part of the restaurant code
// scheme the way provinces and districts are.
export class CreateZoneDto {
  @IsString()
  @MaxLength(200)
  nameEn: string;

  @IsString()
  @MaxLength(200)
  nameAr: string;

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
  @IsInt()
  @Min(0)
  @Max(MAX_SORT_ORDER)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
