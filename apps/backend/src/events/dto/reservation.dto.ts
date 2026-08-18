import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @MaxLength(100)
  guestName: string;

  @IsString()
  @MaxLength(30)
  guestPhone: string;

  @IsInt()
  @Min(1)
  @Max(200)
  partySize: number;

  @IsDateString()
  reservationDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class AvailabilityQueryDto {
  @IsDateString()
  date: string;
}

const STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;

export class UpdateReservationStatusDto {
  @IsIn(STATUSES)
  status: (typeof STATUSES)[number];
}
