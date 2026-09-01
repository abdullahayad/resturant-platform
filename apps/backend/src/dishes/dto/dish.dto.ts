import { IsBoolean, IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUrl, IsUUID, Max, MaxLength } from 'class-validator';
import { MODERATION_STATUSES, type ModerationStatusValue } from '../../common/moderation';

const MAX_PRICE = 100_000_000;

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

export class ListDishesQuery {
  @IsOptional()
  @IsIn(MODERATION_STATUSES)
  status?: ModerationStatusValue;
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
