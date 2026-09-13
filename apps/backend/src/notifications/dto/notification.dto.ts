import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @MaxLength(200)
  titleEn: string;

  @IsString()
  @MaxLength(200)
  titleAr: string;

  @IsString()
  @MaxLength(4000)
  bodyEn: string;

  @IsString()
  @MaxLength(4000)
  bodyAr: string;

  @IsOptional()
  @IsBoolean()
  actionRequired?: boolean;

  // Targeting: if restaurantId is set it wins outright (single restaurant).
  // Otherwise provinceId/businessTypeId narrow the broadcast; both omitted
  // means every restaurant on the platform.
  @IsOptional()
  @IsUUID()
  restaurantId?: string;

  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @IsOptional()
  @IsUUID()
  businessTypeId?: string;
}

export class ReplyToAnnouncementDto {
  @IsString()
  @MaxLength(2000)
  text: string;
}
