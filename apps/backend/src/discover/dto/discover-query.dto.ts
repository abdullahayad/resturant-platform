import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PageQueryDto } from '../../common/pagination';
import { RESTAURANT_CLASSES, type RestaurantClassValue } from '../../common/restaurantClass';

export const DISCOVER_SORTS = ['recommended', 'rating', 'nearest', 'newest'] as const;
export type DiscoverSort = (typeof DISCOVER_SORTS)[number];

// Lists arrive either repeated (?facilityIds=a&facilityIds=b) or
// comma-separated (?facilityIds=a,b) - both end up as a plain array.
const toArray = ({ value }: { value: unknown }) =>
  value === undefined || value === ''
    ? undefined
    : (Array.isArray(value) ? (value as unknown[]) : String(value as string).split(','))
        .map((v) => String(v as string).trim())
        .filter(Boolean);

const toBoolean = ({ value }: { value: unknown }) => value === true || value === 'true';

export class DiscoverQueryDto extends PageQueryDto {
  // Matches restaurant, chain, cuisine and dish names.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @IsOptional()
  @IsUUID()
  districtId?: string;

  @IsOptional()
  @IsUUID()
  moodId?: string;

  // Any of these (a café OR a bakery).
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  businessTypeIds?: string[];

  // Any of these (Iraqi OR Turkish).
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  foodCategoryIds?: string[];

  // All of these (Wi-Fi AND parking) - a customer ticking two facilities
  // needs both, unlike cuisines where either will do.
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  facilityIds?: string[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsIn(RESTAURANT_CLASSES, { each: true })
  classes?: RestaurantClassValue[];

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  // Only with lat/lng.
  @IsOptional()
  @Type(() => Number)
  @Min(0.5)
  @Max(100)
  radiusKm?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  openNow?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  offersOnly?: boolean;

  @IsOptional()
  @IsIn(DISCOVER_SORTS)
  sort?: DiscoverSort;
}
