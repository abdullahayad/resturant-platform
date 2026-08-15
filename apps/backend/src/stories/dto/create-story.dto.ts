import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateStoryDto {
  @IsString()
  mediaUrl: string;

  @IsIn(['photo', 'video'])
  mediaType: 'photo' | 'video';

  @IsOptional()
  @IsString()
  caption?: string;
}
