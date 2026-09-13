import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const MAX_SORT_ORDER = 100_000;
// Case-insensitive at the API boundary — the service uppercases before
// saving, so an admin typing "bg" doesn't get a confusing validation error.
const CODE_PATTERN = /^[A-Za-z]{2}$/;

export class CreateProvinceDto {
  @IsString()
  @MaxLength(200)
  nameEn: string;

  @IsString()
  @MaxLength(200)
  nameAr: string;

  // First segment of every restaurant code in this province, e.g. "BG" for
  // Baghdad -> BGKR001.
  @IsString()
  @Matches(CODE_PATTERN, { message: 'code must be exactly 2 letters' })
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
  @Matches(CODE_PATTERN, { message: 'code must be exactly 2 letters' })
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

  // Second segment of every restaurant code in this district, e.g. "KR" for
  // Karkh -> BGKR001. Only needs to be unique within its own province — the
  // province code already disambiguates across provinces.
  @IsString()
  @Matches(CODE_PATTERN, { message: 'code must be exactly 2 letters' })
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
  @Matches(CODE_PATTERN, { message: 'code must be exactly 2 letters' })
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
