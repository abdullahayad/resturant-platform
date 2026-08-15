import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateProvinceDto {
  @IsString()
  nameEn: string;

  @IsString()
  nameAr: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateProvinceDto {
  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateDistrictDto {
  @IsString()
  nameEn: string;

  @IsString()
  nameAr: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateDistrictDto {
  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
