import { IsIn, IsOptional, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator';
import { CREATABLE_GALLERY_ALBUMS, GALLERY_ALBUMS, type CreatableGalleryAlbumValue, type GalleryAlbumValue } from '../../common/gallery';
import { MODERATION_STATUSES, type ModerationStatusValue } from '../../common/moderation';

const AMBIENCE_SUB_CATEGORIES = ['OUTDOOR', 'INDOOR', 'OTHER'] as const;

export class CreateGalleryPhotoDto {
  @IsIn(CREATABLE_GALLERY_ALBUMS)
  album: CreatableGalleryAlbumValue;

  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @IsOptional()
  @IsUUID()
  dishId?: string;

  @IsOptional()
  @IsIn(AMBIENCE_SUB_CATEGORIES)
  ambienceSubCategory?: (typeof AMBIENCE_SUB_CATEGORIES)[number];
}

export class ListGalleryQuery {
  @IsOptional()
  @IsIn(GALLERY_ALBUMS)
  album?: GalleryAlbumValue;
}

export class ModerateGalleryPhotoDto {
  @IsIn(MODERATION_STATUSES)
  status: ModerationStatusValue;
}

export class ListGalleryPhotosQuery {
  @IsOptional()
  @IsIn(MODERATION_STATUSES)
  status?: ModerationStatusValue;
}
