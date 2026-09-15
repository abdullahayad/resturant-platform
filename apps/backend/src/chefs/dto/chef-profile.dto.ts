import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
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

  // Dishes from the restaurant's own menu this chef is known for - e.g.
  // Head Chef -> "Lamb Quzi, Grilled Kebab". Omitted (undefined) leaves the
  // existing set untouched; an empty array clears it.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  signatureDishIds?: string[];
}
