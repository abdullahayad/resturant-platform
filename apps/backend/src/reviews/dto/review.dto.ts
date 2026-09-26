import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MODERATION_STATUSES, type ModerationStatusValue } from '../../common/moderation';
import { PageQueryDto } from '../../common/pagination';
import { IsOwnStoragePhotoUrl } from '../../common/ownStoragePhotoUrl';

// Bounds a public, unauthenticated write — same reasoning as every other
// gated field on this endpoint (see security review).
const MAX_REVIEW_PHOTOS = 5;

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_REVIEW_PHOTOS)
  @IsOwnStoragePhotoUrl({ each: true })
  @MaxLength(2000, { each: true })
  photoUrls?: string[];
}

export class ReplyToReviewDto {
  @IsString()
  @MaxLength(2000)
  text: string;
}

export class ModerateReviewDto {
  @IsIn(MODERATION_STATUSES)
  status: ModerationStatusValue;
}

export class ListReviewsQuery extends PageQueryDto {
  @IsOptional()
  @IsIn(MODERATION_STATUSES)
  status?: ModerationStatusValue;
}

export class MyReviewsQuery extends PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}

export class NewReviewsCountQuery {
  @IsDateString()
  since: string;
}
