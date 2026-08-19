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

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;
const SCOPES = ['WHOLE_MENU', 'SPECIFIC_DISHES'] as const;
export const MAX_FIXED_DISCOUNT = 10_000_000;

export class CreatePromotionDto {
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

  // Upper bound here is generous (covers FIXED_AMOUNT); the tighter
  // percentage<=100 rule is a cross-field check enforced in the service.
  @IsNumber()
  @Min(0.01)
  @Max(MAX_FIXED_DISCOUNT)
  discountValue: number;

  @IsIn(SCOPES)
  scope: (typeof SCOPES)[number];

  // Required when scope is SPECIFIC_DISHES (checked in the service, where
  // each id can also be verified to belong to the calling restaurant).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  dishIds?: string[];

  @IsBoolean()
  isRecurring: boolean;

  // One-off: a date range
  @ValidateIf((dto: CreatePromotionDto) => !dto.isRecurring)
  @IsDateString()
  validFrom?: string;

  @ValidateIf((dto: CreatePromotionDto) => !dto.isRecurring)
  @IsDateString()
  validUntil?: string;

  // Recurring: a day of week, with an optional time window — omitted
  // start/end means "all day" (a day special rather than a happy hour).
  @ValidateIf((dto: CreatePromotionDto) => dto.isRecurring)
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

export class UpdatePromotionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleAr?: string;

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

  @IsOptional()
  @IsIn(DISCOUNT_TYPES)
  discountType?: (typeof DISCOUNT_TYPES)[number];

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(MAX_FIXED_DISCOUNT)
  discountValue?: number;

  @IsOptional()
  @IsIn(SCOPES)
  scope?: (typeof SCOPES)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  dishIds?: string[];

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ModeratePromotionDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}

const PROMOTION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export class ListPromotionsQuery {
  @IsOptional()
  @IsIn(PROMOTION_STATUSES)
  status?: (typeof PROMOTION_STATUSES)[number];
}
