import { MinLength } from 'class-validator';

export class ChangePasswordDto {
  @MinLength(1)
  currentPassword: string;

  @MinLength(8)
  newPassword: string;
}
