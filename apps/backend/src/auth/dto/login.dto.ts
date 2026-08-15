import { IsEmail, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @MinLength(1)
  password: string;
}
