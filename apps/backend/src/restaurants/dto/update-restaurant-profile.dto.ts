import {
  ArrayMaxSize,
  IsArray,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';

const MAX_MASTER_DATA_SELECTIONS = 50;

export class UpdateRestaurantProfileDto {
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
  @MaxLength(30)
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

  // require_tld:false — local dev serves uploads from http://localhost:9000
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  logoUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_MASTER_DATA_SELECTIONS)
  @IsUUID(undefined, { each: true })
  businessTypeIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_MASTER_DATA_SELECTIONS)
  @IsUUID(undefined, { each: true })
  foodCategoryIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_MASTER_DATA_SELECTIONS)
  @IsUUID(undefined, { each: true })
  facilityIds?: string[];
}
