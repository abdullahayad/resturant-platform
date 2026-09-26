import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import type { AdminJwtPayload } from './jwt-payload';
import { clearAdminAuthCookies, setAdminAuthCookies } from '../common/adminAuthCookies';

// Tighter than the app default — these are the highest-value brute-force
// targets in the app (see security review).
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('partner/login')
  partnerLogin(@Body() dto: LoginDto) {
    return this.auth.partnerLogin(dto);
  }

  @Post('staff/login')
  staffLogin(@Body() dto: LoginDto) {
    return this.auth.staffLogin(dto);
  }

  // The token never reaches the response body - it goes straight into an
  // httpOnly cookie the admin portal's own JS can never read (see
  // adminAuthCookies.ts). Only the admin's profile comes back for the
  // frontend to display.
  @Post('admin/login')
  async adminLogin(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, admin } = await this.auth.adminLogin(dto);
    setAdminAuthCookies(res, accessToken);
    return { admin };
  }

  @Post('admin/logout')
  adminLogout(@Res({ passthrough: true }) res: Response) {
    clearAdminAuthCookies(res);
    return { success: true };
  }

  // The admin portal has no other way to know "am I signed in" on page
  // load or refresh - the cookie that answers that is httpOnly, so its own
  // JS can't just check for it directly the way it used to check
  // localStorage.
  @UseGuards(AdminAuthGuard)
  @Get('admin/me')
  async adminMe(@Req() req: { user: AdminJwtPayload }) {
    const admin = await this.prisma.db.adminUser.findUniqueOrThrow({
      where: { id: req.user.sub },
      select: { id: true, fullName: true, role: true, email: true },
    });
    return { admin };
  }
}
