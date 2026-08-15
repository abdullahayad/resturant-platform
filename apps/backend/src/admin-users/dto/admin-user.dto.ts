import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const ROLES = ['SUPER_ADMIN', 'MODERATOR'] as const;

export class CreateAdminUserDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsString()
  fullName: string;

  @IsIn(ROLES)
  role: (typeof ROLES)[number];
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsIn(ROLES)
  role?: (typeof ROLES)[number];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
