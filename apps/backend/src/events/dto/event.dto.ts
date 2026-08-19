import {
  IsBoolean,
  IsDateString,
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
const MAX_PRICE = 100_000_000;
const MAX_CAPACITY = 10_000;

export class CreateEventDto {
  @IsUUID()
  eventTypeId: string;

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_CAPACITY)
  capacity?: number;

  @IsBoolean()
  isRecurring: boolean;

  // One-off events
  @ValidateIf((dto: CreateEventDto) => !dto.isRecurring)
  @IsDateString()
  eventDate?: string;

  // Recurring events
  @ValidateIf((dto: CreateEventDto) => dto.isRecurring)
  @IsInt()
  @Min(0)
  @Max(6)
  recurringDayOfWeek?: number;

  @ValidateIf((dto: CreateEventDto) => dto.isRecurring)
  @Matches(TIME_PATTERN, { message: 'recurringTime must be in HH:mm 24-hour format' })
  recurringTime?: string;
}

export class UpdateEventDto {
  @IsOptional()
  @IsUUID()
  eventTypeId?: string;

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
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_CAPACITY)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  recurringDayOfWeek?: number;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'recurringTime must be in HH:mm 24-hour format' })
  recurringTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
