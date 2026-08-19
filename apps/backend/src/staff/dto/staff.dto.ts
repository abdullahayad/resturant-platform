import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// OWNER is the restaurant's own login (created at registration), not something
// you invite someone else as — staff invites are limited to these two roles.
const INVITABLE_ROLES = ['MANAGER', 'MENU_EDITOR'] as const;

export class InviteStaffDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MaxLength(200)
  fullName: string;

  @IsIn(INVITABLE_ROLES)
  role: (typeof INVITABLE_ROLES)[number];
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @IsIn(INVITABLE_ROLES)
  role?: (typeof INVITABLE_ROLES)[number];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
