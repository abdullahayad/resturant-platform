import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { AppVersionSettingsDto } from './app-version.dto';
import { AppVersionService } from './app-version.service';

@Controller('app-version')
export class AppVersionController {
  constructor(private readonly versions: AppVersionService) {}

  @UseGuards(AdminAuthGuard)
  @Get('admin')
  settings() {
    return this.versions.settings();
  }

  @UseGuards(AdminAuthGuard)
  @Put('admin')
  update(@Body() dto: AppVersionSettingsDto) {
    return this.versions.update(dto);
  }

  // Public, no login: each app asks this when it opens.
  @Get(':app')
  forApp(@Param('app') app: string) {
    return this.versions.forApp(app);
  }
}
