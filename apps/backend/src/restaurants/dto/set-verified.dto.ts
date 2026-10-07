import { IsBoolean } from 'class-validator';

export class SetVerifiedDto {
  @IsBoolean()
  isVerified: boolean;
}
