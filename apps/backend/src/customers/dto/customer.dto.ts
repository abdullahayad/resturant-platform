import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class RequestCodeDto {
  @IsString()
  @MaxLength(20)
  phone: string;
}

export class VerifyCodeDto {
  @IsString()
  @MaxLength(20)
  phone: string;

  @Matches(/^\d{6}$/, { message: 'The code is 6 digits' })
  code: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class ScanVisitDto {
  @IsString()
  @MaxLength(200)
  code: string;
}
