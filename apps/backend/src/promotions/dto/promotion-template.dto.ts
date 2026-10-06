import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { DISCOUNT_TYPES, MAX_FIXED_DISCOUNT, SCOPES, TIME_PATTERN } from './promotion.dto';

// Same shape as CreatePromotionDto minus validFrom/validUntil (see
// PromotionTemplate's schema comment for why) plus a name for the
// template itself.
export class CreatePromotionTemplateDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(200)
  titleEn: string;

  @IsString()
  @MaxLength(200)
  titleAr: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionAr?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  photoUrl?: string;

  @IsIn(DISCOUNT_TYPES)
  discountType: (typeof DISCOUNT_TYPES)[number];

  @IsNumber()
  @Min(0.01)
  @Max(MAX_FIXED_DISCOUNT)
  discountValue: number;

  @IsIn(SCOPES)
  scope: (typeof SCOPES)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  dishIds?: string[];

  @IsBoolean()
  isRecurring: boolean;

  @ValidateIf((dto: CreatePromotionTemplateDto) => dto.isRecurring)
  @IsInt()
  @Min(0)
  @Max(6)
  recurringDayOfWeek?: number;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm 24-hour format' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:mm 24-hour format' })
  endTime?: string;
}

// Body for applying a template - only needed for a non-recurring template,
// which has no saved date range and needs a fresh one each time it's used.
export class ApplyPromotionTemplateDto {
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
