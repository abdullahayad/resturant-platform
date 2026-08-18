import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  guestName: string;

  @IsString()
  guestPhone: string;

  @IsInt()
  @Min(1)
  partySize: number;

  @IsDateString()
  reservationDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

const STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;

export class UpdateReservationStatusDto {
  @IsIn(STATUSES)
  status: (typeof STATUSES)[number];
}
