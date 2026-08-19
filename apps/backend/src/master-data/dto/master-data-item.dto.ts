import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const MAX_SORT_ORDER = 100_000;

export class CreateMasterDataItemDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(20)
  icon?: string;
}

export class UpdateMasterDataItemDto {
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
  @IsString()
  @MaxLength(20)
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
