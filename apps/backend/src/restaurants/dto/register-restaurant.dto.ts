import {
  IsArray,
  IsEmail,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class RegisterRestaurantDto {
  @IsString()
  nameEn: string;

  @IsString()
  nameAr: string;

  @IsString()
  phone: string;

  @IsEmail()
  ownerEmail: string;

  @MinLength(8)
  ownerPassword: string;

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

  @IsArray()
  @IsUUID(undefined, { each: true })
  businessTypeIds: string[];

  @IsArray()
  @IsUUID(undefined, { each: true })
  foodCategoryIds: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  facilityIds?: string[];
}
