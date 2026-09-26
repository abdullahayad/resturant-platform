import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { CREATABLE_GALLERY_ALBUMS, GALLERY_ALBUMS, type CreatableGalleryAlbumValue, type GalleryAlbumValue } from '../../common/gallery';
import { MODERATION_STATUSES, type ModerationStatusValue } from '../../common/moderation';
import { PageQueryDto } from '../../common/pagination';
import { IsOwnStoragePhotoUrl } from '../../common/ownStoragePhotoUrl';

const AMBIENCE_SUB_CATEGORIES = ['OUTDOOR', 'INDOOR', 'OTHER'] as const;

export class CreateGalleryPhotoDto {
  @IsIn(CREATABLE_GALLERY_ALBUMS)
  album: CreatableGalleryAlbumValue;

  @IsOwnStoragePhotoUrl()
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

// Powers Photo Gallery's per-tab browsing: album is the top-level tab, and
// at most one of the sub-filters below applies depending on which album -
// mostOrdered/menuCategoryId for FOOD, ambienceSubCategory for AMBIENCE.
// Fetching one tab's slice at a time (paginated) replaced the screen's old
// "load every photo, slice client-side" approach, which broke down once a
// restaurant had enough photos that a tab's real content wasn't all on the
// first fetch.
export class ListGalleryQuery extends PageQueryDto {
  @IsOptional()
  @IsIn(GALLERY_ALBUMS)
  album?: GalleryAlbumValue;

  // "?mostOrdered=true" only ever gets sent when true (the app just omits
  // the param otherwise) - a plain @Type(() => Boolean) would misparse the
  // string "false" as true, so this maps explicitly instead.
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  mostOrdered?: boolean;

  @IsOptional()
  @IsUUID()
  menuCategoryId?: string;

  @IsOptional()
  @IsIn(AMBIENCE_SUB_CATEGORIES)
  ambienceSubCategory?: (typeof AMBIENCE_SUB_CATEGORIES)[number];
}

export class ModerateGalleryPhotoDto {
  @IsIn(MODERATION_STATUSES)
  status: ModerationStatusValue;
}

export class SetGalleryCoverDto {
  @IsBoolean()
  cover: boolean;
}

export class ListGalleryPhotosQuery extends PageQueryDto {
  @IsOptional()
  @IsIn(MODERATION_STATUSES)
  status?: ModerationStatusValue;
}
