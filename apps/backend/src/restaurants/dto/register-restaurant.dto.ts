import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

// Generous but bounded — these gate a public, unauthenticated endpoint, so
// every field needs an upper bound regardless of how unlikely a legitimate
// submission is to approach it (see security review).
const MAX_MASTER_DATA_SELECTIONS = 50;

export class RegisterRestaurantDto {
  @IsString()
  @MaxLength(200)
  nameEn: string;

  @IsString()
  @MaxLength(200)
  nameAr: string;

  @IsString()
  @MaxLength(30)
  phone: string;

  @IsEmail()
  @MaxLength(255)
  ownerEmail: string;

  @MinLength(8)
  @MaxLength(128)
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
  @ArrayMaxSize(MAX_MASTER_DATA_SELECTIONS)
  @IsUUID(undefined, { each: true })
  businessTypeIds: string[];

  @IsArray()
  @ArrayMaxSize(MAX_MASTER_DATA_SELECTIONS)
  @IsUUID(undefined, { each: true })
  foodCategoryIds: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_MASTER_DATA_SELECTIONS)
  @IsUUID(undefined, { each: true })
  facilityIds?: string[];
}
