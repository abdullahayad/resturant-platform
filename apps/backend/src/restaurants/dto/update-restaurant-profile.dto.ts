import {
  IsArray,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateRestaurantProfileDto {
  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @IsOptional()
  @IsUUID()
  districtId?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  businessTypeIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  foodCategoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  facilityIds?: string[];
}
