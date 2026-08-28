import { IsEmail, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit number' })
  code: string;

  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
