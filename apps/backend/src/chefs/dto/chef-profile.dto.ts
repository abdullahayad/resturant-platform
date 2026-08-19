import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertChefProfileDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  speciality?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  yearsExperience?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  awards?: string[];
}
