import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPrefsDto {
  @IsOptional()
  @IsBoolean()
  notifyNewReview?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyNewBooking?: boolean;
}
