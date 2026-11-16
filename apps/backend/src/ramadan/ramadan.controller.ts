import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { RamadanSettingsDto } from './ramadan.dto';
import { RamadanService } from './ramadan.service';

@Controller('home/ramadan')
export class RamadanController {
  constructor(private readonly ramadan: RamadanService) {}

  // Public: the Ramadan card on the customer app's Home.
  @Get()
  status() {
    return this.ramadan.status();
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin')
  settings() {
    return this.ramadan.settings();
  }

  @UseGuards(AdminAuthGuard)
  @Put('admin')
  update(@Body() dto: RamadanSettingsDto) {
    return this.ramadan.update(dto);
  }
}
