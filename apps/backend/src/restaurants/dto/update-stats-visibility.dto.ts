import { IsBoolean } from 'class-validator';

export class UpdateStatsVisibilityDto {
  @IsBoolean()
  statsVisible: boolean;
}
