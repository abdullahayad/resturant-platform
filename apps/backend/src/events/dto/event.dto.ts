import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateEventDto {
  @IsUUID()
  eventTypeId: string;

  @IsString()
  titleEn: string;

  @IsString()
  titleAr: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

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
  titleEn?: string;

  @IsOptional()
  @IsString()
  titleAr?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

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
