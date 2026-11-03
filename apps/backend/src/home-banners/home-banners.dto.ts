import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { IsOwnStoragePhotoUrl } from '../common/ownStoragePhotoUrl';

// Mirrors prisma/schema.prisma's HomeBannerLink enum.
export const HOME_BANNER_LINKS = ['NONE', 'RESTAURANT', 'MOOD', 'HEALTHY', 'OFFERS', 'EVENTS'] as const;
export type HomeBannerLinkValue = (typeof HOME_BANNER_LINKS)[number];

export class HomeBannerDto {
  @IsString()
  @MaxLength(80)
  titleEn: string;

  @IsString()
  @MaxLength(80)
  titleAr: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subtitleEn?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subtitleAr?: string | null;

  // Only images uploaded to LiGETA's own storage, never an arbitrary link.
  @IsOptional()
  @IsOwnStoragePhotoUrl()
  @MaxLength(2000)
  imageUrl?: string | null;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string | null;

  @IsOptional()
  @IsIn(HOME_BANNER_LINKS)
  linkType?: HomeBannerLinkValue;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  linkValue?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
