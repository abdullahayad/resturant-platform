import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateStoryDto {
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  mediaUrl: string;

  @IsIn(['photo', 'video'])
  mediaType: 'photo' | 'video';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;
}
