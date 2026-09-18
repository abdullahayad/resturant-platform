import { IsString, MaxLength } from 'class-validator';

export class CreateChainDto {
  @IsString()
  @MaxLength(200)
  nameEn: string;

  @IsString()
  @MaxLength(200)
  nameAr: string;
}

export class UpdateChainDto extends CreateChainDto {}
