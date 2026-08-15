import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const ALBUMS = ['FOOD', 'MENU', 'AMBIENCE'] as const;
const AMBIENCE_SUB_CATEGORIES = ['OUTDOOR', 'INDOOR', 'OTHER'] as const;

export class CreateGalleryPhotoDto {
  @IsIn(ALBUMS)
  album: (typeof ALBUMS)[number];

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
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
  @IsIn(ALBUMS)
  album?: (typeof ALBUMS)[number];
}
