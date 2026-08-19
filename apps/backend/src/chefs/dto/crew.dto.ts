import { IsInt, IsOptional, IsUrl, Max, MaxLength, Min } from 'class-validator';

export class UpdateCrewDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  crewCount?: number;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  crewPhotoUrl?: string;
}
