import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsLatitude, IsLongitude, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';
import { PageQueryDto } from '../../common/pagination';

const toBoolean = ({ value }: { value: unknown }) => value === true || value === 'true';

export const OFFER_SORTS = ['newest', 'nearest', 'ending', 'biggest'] as const;
export type OfferSort = (typeof OFFER_SORTS)[number];

export class OffersQueryDto extends PageQueryDto {
  // The Offers tab's sort switch. "nearest" needs lat/lng, otherwise it
  // falls back to newest.
  @IsOptional()
  @IsIn(OFFER_SORTS)
  sort?: OfferSort;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;
}

export class BudgetDishesQueryDto extends PageQueryDto {
  // IQD. The Offers tab's "بـ5 آلاف وأقل" uses the default.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(500)
  @Max(100000)
  maxPrice?: number;

  // The price bands ("3,000 - 5,000").
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  minPrice?: number;

  // Dishes from restaurants of this cuisine (the round category icons).
  @IsOptional()
  @IsUUID()
  cuisineId?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  healthyOnly?: boolean;
}

export class DiscoverEventsQueryDto extends PageQueryDto {
  // A Baghdad calendar day, "YYYY-MM-DD" - the Events tab's date strip.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsUUID()
  eventTypeId?: string;

  // One restaurant's events, for its own page.
  @IsOptional()
  @IsUUID()
  restaurantId?: string;
}
