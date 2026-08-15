import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateDishDto {
  @IsString()
  nameEn: string;

  @IsString()
  nameAr: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsOptional()
  @IsUUID()
  menuCategoryId?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isMostOrdered?: boolean;
}

export class UpdateDishDto {
  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsUUID()
  menuCategoryId?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isMostOrdered?: boolean;
}
