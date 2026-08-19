import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const ROLES = ['SUPER_ADMIN', 'MODERATOR'] as const;

export class CreateAdminUserDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MaxLength(200)
  fullName: string;

  @IsIn(ROLES)
  role: (typeof ROLES)[number];
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @IsIn(ROLES)
  role?: (typeof ROLES)[number];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
