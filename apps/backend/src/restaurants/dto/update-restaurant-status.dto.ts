import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RejectRestaurantDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class ListRestaurantsQuery {
  @IsOptional()
  @IsIn(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'])
  status?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @IsOptional()
  @IsUUID()
  districtId?: string;

  @IsOptional()
  @IsUUID()
  businessTypeId?: string;

  @IsOptional()
  @IsUUID()
  foodCategoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
