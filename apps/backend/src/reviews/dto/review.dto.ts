import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  @MaxLength(100)
  reviewerName: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  foodRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  serviceRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  staffRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  ambienceRating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;
}

export class ReplyToReviewDto {
  @IsString()
  @MaxLength(2000)
  text: string;
}

const MODERATION_STATUSES = ['VISIBLE', 'FLAGGED', 'HIDDEN'] as const;

export class ModerateReviewDto {
  @IsIn(MODERATION_STATUSES)
  status: (typeof MODERATION_STATUSES)[number];
}

export class ListReviewsQuery {
  @IsOptional()
  @IsIn(MODERATION_STATUSES)
  status?: (typeof MODERATION_STATUSES)[number];
}
