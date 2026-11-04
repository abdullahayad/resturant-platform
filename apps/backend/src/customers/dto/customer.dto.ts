import { OmitType } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
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
