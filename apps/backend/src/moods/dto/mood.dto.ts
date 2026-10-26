import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { MOOD_GROUPS, type MoodGroupValue } from '../../common/moodGroup';
import { RESTAURANT_CLASSES, type RestaurantClassValue } from '../../common/restaurantClass';

export class CreateMoodDto {
  @IsString()
  @MaxLength(80)
  nameEn: string;

  @IsString()
  @MaxLength(80)
  nameAr: string;

  @IsString()
  @MaxLength(16)
  emoji: string;

  @IsOptional()
  @IsIn(MOOD_GROUPS)
  group?: MoodGroupValue;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  foodsEn?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  foodsAr?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  matchNotes?: string | null;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  businessTypeIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  foodCategoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  facilityIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  eventTypeIds?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(RESTAURANT_CLASSES, { each: true })
  classes?: RestaurantClassValue[];

  @IsOptional()
  @IsBoolean()
  healthyOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  openAfterMidnight?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateMoodDto extends CreateMoodDto {}
