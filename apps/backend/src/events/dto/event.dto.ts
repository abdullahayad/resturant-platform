import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
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
import { MODERATION_STATUSES, type ModerationStatusValue } from '../../common/moderation';
import { PageQueryDto } from '../../common/pagination';

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
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  recurringDaysOfWeek?: number[];

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
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  recurringDaysOfWeek?: number[];

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'recurringTime must be in HH:mm 24-hour format' })
  recurringTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ModerateEventDto {
  @IsIn(MODERATION_STATUSES)
  status: ModerationStatusValue;
}

export class ListEventsQuery extends PageQueryDto {
  @IsOptional()
  @IsIn(MODERATION_STATUSES)
  status?: ModerationStatusValue;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  // Content Moderation wants moderation-queue order (createdAt); Event
  // Bookings wants busiest-first so admin can see at a glance which events
  // are generating real demand - same endpoint, two different consumers.
  @IsOptional()
  @IsIn(['createdAt', 'reservationCount'])
  sort?: 'createdAt' | 'reservationCount';
}
