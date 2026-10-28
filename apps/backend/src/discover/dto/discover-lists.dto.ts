import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';
import { PageQueryDto } from '../../common/pagination';

export class BudgetDishesQueryDto extends PageQueryDto {
  // IQD. The Offers tab's "بـ5 آلاف وأقل" uses the default.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(500)
  @Max(100000)
  maxPrice?: number;
}

export class DiscoverEventsQueryDto extends PageQueryDto {
  // A Baghdad calendar day, "YYYY-MM-DD" - the Events tab's date strip.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsUUID()
  eventTypeId?: string;
}
