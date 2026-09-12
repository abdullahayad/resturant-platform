import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { SetFeatureFlagOverrideDto, UpdateFeatureFlagDto } from './dto/feature-flag.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller('admin/feature-flags')
export class AdminFeatureFlagsController {
  constructor(private readonly featureFlags: FeatureFlagsService) {}

  @Get()
  list() {
    return this.featureFlags.adminList();
  }

  @Patch(':id')
  updateDefault(@Param('id') id: string, @Body() dto: UpdateFeatureFlagDto) {
    return this.featureFlags.updateDefault(id, dto.defaultEnabled);
  }

  @Post(':id/overrides')
  setOverride(@Param('id') id: string, @Body() dto: SetFeatureFlagOverrideDto) {
    return this.featureFlags.setOverride(id, dto);
  }

  @Delete('overrides/:overrideId')
  removeOverride(@Param('overrideId') overrideId: string) {
    return this.featureFlags.removeOverride(overrideId);
  }
}
