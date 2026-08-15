import { IsIn, IsOptional, IsString } from 'class-validator';

export class RejectRestaurantDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ListRestaurantsQuery {
  @IsOptional()
  @IsIn(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'])
  status?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
}
