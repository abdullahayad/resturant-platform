import { IsString, Length, Matches } from 'class-validator';

export class TwoFactorCodeDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;
}

export class VerifyTwoFactorDto extends TwoFactorCodeDto {
  @IsString()
  @Length(1, 2048)
  pendingToken: string;
}
