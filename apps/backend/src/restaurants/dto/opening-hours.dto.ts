import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsBoolean, IsInt, IsOptional, Matches, Max, Min, ValidateNested } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class DayHoursDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsBoolean()
  isClosed: boolean;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'openTime must be in HH:mm 24-hour format' })
  openTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'closeTime must be in HH:mm 24-hour format' })
  closeTime?: string;
}

export class UpdateOpeningHoursDto {
  @ValidateNested({ each: true })
  @Type(() => DayHoursDto)
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  days: DayHoursDto[];
}
