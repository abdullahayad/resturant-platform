import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateMasterDataItemDto {
  @IsString()
  nameEn: string;

  @IsString()
  nameAr: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  icon?: string;
}

export class UpdateMasterDataItemDto {
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
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
