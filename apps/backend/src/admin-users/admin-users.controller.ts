import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import type { AdminJwtPayload } from '../auth/jwt-payload';

@UseGuards(SuperAdminGuard)
@Controller('admin-users')
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  @Get()
  list() {
    return this.adminUsers.list();
  }

  @Post()
  create(@Body() dto: CreateAdminUserDto) {
    return this.adminUsers.create(dto);
  }

  @Patch(':id')
  update(@Req() req: { user: AdminJwtPayload }, @Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.adminUsers.update(id, dto, req.user.sub);
  }
}
