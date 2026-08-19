import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { StaffService } from './staff.service';
import { InviteStaffDto, UpdateStaffDto } from './dto/staff.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@Controller('restaurants/me/staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @UseGuards(PartnerAuthGuard)
  @Get()
  list(@Req() req: { user: PartnerJwtPayload }) {
    return this.staff.list(req.user.sub);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Post()
  invite(@Req() req: { user: PartnerJwtPayload }, @Body() dto: InviteStaffDto) {
    return this.staff.invite(req.user.sub, dto);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Patch(':id')
  update(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staff.update(req.user.sub, id, dto);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Delete(':id')
  remove(@Req() req: { user: PartnerJwtPayload }, @Param('id') id: string) {
    return this.staff.remove(req.user.sub, id);
  }
}
