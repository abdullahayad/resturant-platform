import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, registerDecorator, type ValidationOptions } from 'class-validator';
import { Type } from 'class-transformer';
import { MODERATION_STATUSES, type ModerationStatusValue } from '../../common/moderation';
import { PageQueryDto } from '../../common/pagination';

// Bounds a public, unauthenticated write — same reasoning as every other
// gated field on this endpoint (see security review).
const MAX_REVIEW_PHOTOS = 5;

// Unlike the partner-authenticated gallery-photo endpoint, review creation
// is public and unauthenticated — accepting arbitrary external URLs here
// would let anonymous callers plant attacker-controlled links that load in
// staff browsers the moment a review is opened. Restrict to this
// deployment's own storage host instead (see security review).
function IsOwnStoragePhotoUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isOwnStoragePhotoUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const allowedBase = process.env.STORAGE_PUBLIC_URL ?? process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000';
          try {
            return new URL(value).host === new URL(allowedBase).host;
          } catch {
            return false;
          }
        },
        defaultMessage() {
          return 'photoUrls must point to this platform\'s own storage';
        },
      },
    });
  };
}

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
