import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateLoyaltyTierDto {
  @IsString()
  @MaxLength(60)
  labelEn: string;

  @IsString()
  @MaxLength(60)
  labelAr: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  thresholdCount: number;

  @IsString()
  @MaxLength(300)
  rewardEn: string;

  @IsString()
  @MaxLength(300)
  rewardAr: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateLoyaltyTierDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  labelEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  labelAr?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  thresholdCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  rewardEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  rewardAr?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
