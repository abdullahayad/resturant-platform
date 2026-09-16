import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MODERATION_STATUSES, type ModerationStatusValue } from '../../common/moderation';
import { PageQueryDto } from '../../common/pagination';

export const MAX_PRICE = 100_000_000;
export const PRICE_ADJUSTMENT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;
export type PriceAdjustmentType = (typeof PRICE_ADJUSTMENT_TYPES)[number];

export class CreateDishDto {
  @IsString()
  @MaxLength(200)
  nameEn: string;

  @IsString()
  @MaxLength(200)
  nameAr: string;

  @IsNumber()
  @IsPositive()
  @Max(MAX_PRICE)
  price: number;

  @IsOptional()
  @IsUUID()
  menuCategoryId?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  photoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isMostOrdered?: boolean;
}

export class ModerateDishDto {
  @IsIn(MODERATION_STATUSES)
  status: ModerationStatusValue;
}

export class ListDishesQuery extends PageQueryDto {
  @IsOptional()
  @IsIn(MODERATION_STATUSES)
  status?: ModerationStatusValue;
}

export class BulkUpdatePricesDto {
  @IsIn(PRICE_ADJUSTMENT_TYPES)
  type: PriceAdjustmentType;

  // Signed - e.g. 10 raises every price 10%, -10 lowers it 10% (PERCENTAGE);
  // 500 adds 500 IQD, -500 subtracts it (FIXED_AMOUNT). The exact resulting
  // price is always computed and clamped server-side (never trusted from a
  // client-side preview), so these bounds only need to rule out garbage
  // input, not model the real min/max a restaurant would ever want.
  @IsNumber()
  @Min(-MAX_PRICE)
  @Max(MAX_PRICE)
  value: number;

  // Omit to apply to every one of the restaurant's own active dishes;
  // provide specific ids to apply to only those.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  dishIds?: string[];
}

export class UpdateDishDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameAr?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(MAX_PRICE)
  price?: number;

  @IsOptional()
  @IsUUID()
  menuCategoryId?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  photoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isMostOrdered?: boolean;
}
