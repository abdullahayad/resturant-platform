import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RequestFeaturedDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class GrantFeaturedDto {
  @IsUUID()
  restaurantId: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ModerateFeaturedDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

const FEATURED_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export class ListFeaturedQuery {
  @IsOptional()
  @IsIn(FEATURED_STATUSES)
  status?: (typeof FEATURED_STATUSES)[number];
}
