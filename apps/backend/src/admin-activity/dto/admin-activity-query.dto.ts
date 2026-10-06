import { IsIn, IsOptional } from 'class-validator';
import { PageQueryDto } from '../../common/pagination';
import { ADMIN_ACTIVITY_SECTIONS, type AdminActivitySection } from '../../restaurant-activity-log/sections';

export class AdminActivityQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(ADMIN_ACTIVITY_SECTIONS)
  section?: AdminActivitySection;
}
