import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsBoolean, IsUUID } from 'class-validator';
import { MoodsService } from './moods.service';
import { CreateMoodDto, UpdateMoodDto } from './dto/mood.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

class SetMoodActiveDto {
  @IsBoolean()
  isActive: boolean;
}

class ReorderMoodsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  ids: string[];
}

@Controller('moods')
export class MoodsController {
  constructor(private readonly moods: MoodsService) {}

  // Public: the switched-on moods for the customer app's Home screen.
  @Get()
  listActive() {
    return this.moods.listActive();
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin')
  list() {
    return this.moods.list();
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin')
  create(@Body() dto: CreateMoodDto) {
    return this.moods.create(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch('admin/reorder')
  reorder(@Body() dto: ReorderMoodsDto) {
    return this.moods.reorder(dto.ids);
  }

  @UseGuards(AdminAuthGuard)
  @Patch('admin/:id')
  update(@Param('id') id: string, @Body() dto: UpdateMoodDto) {
    return this.moods.update(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch('admin/:id/active')
  setActive(@Param('id') id: string, @Body() dto: SetMoodActiveDto) {
    return this.moods.setActive(id, dto.isActive);
  }

  @UseGuards(AdminAuthGuard)
  @Delete('admin/:id')
  remove(@Param('id') id: string) {
    return this.moods.remove(id);
  }
}
