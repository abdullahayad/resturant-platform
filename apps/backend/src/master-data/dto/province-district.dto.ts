import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const MAX_SORT_ORDER = 100_000;

export class CreateProvinceDto {
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
  @IsInt()
  @Min(0)
  @Max(MAX_SORT_ORDER)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
