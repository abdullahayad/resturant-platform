import { OmitType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { REPORT_REASONS, type ReportReasonValue } from '../reports.service';
import { SUPPORT_TOPICS, type SupportTopicValue } from '../customer-support.service';
import { CreateReviewDto } from '../../reviews/dto/review.dto';

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

  // A critic's cuisines (FoodCategory ids), up to 3.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsUUID('all', { each: true })
  specialtyIds?: string[];

  @IsOptional()
  @IsBoolean()
  notifyFollowing?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyCampaigns?: boolean;
}

export class CustomerPushTokenDto {
  // An Expo push token, e.g. "ExponentPushToken[xxxx]".
  @Matches(/^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/)
  token: string;

  @IsOptional()
  @IsIn(['ar', 'en'])
  language?: 'ar' | 'en';
}

export class ReportReviewDto {
  @IsIn(REPORT_REASONS)
  reason: ReportReasonValue;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

// A review written in the customer app - the name and phone come from the
// signed-in account instead of the form.
export class CustomerReviewDto extends OmitType(CreateReviewDto, ['reviewerName', 'reviewerPhone'] as const) {}

export class OpenSupportTicketDto {
  @IsIn(SUPPORT_TOPICS)
  topic: SupportTopicValue;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;

  @IsOptional()
  @IsUUID()
  restaurantId?: string;
}

export class SupportMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;
}

export class ScanVisitDto {
  @IsString()
  @MaxLength(200)
  code: string;
}
