import { IsEmail, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @MinLength(1)
  @MaxLength(128)
  password: string;
}
