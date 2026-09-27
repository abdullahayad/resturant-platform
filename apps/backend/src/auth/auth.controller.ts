import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TwoFactorCodeDto, VerifyTwoFactorDto } from './dto/two-factor.dto';
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
  // frontend to display. A 2FA-enabled admin gets no cookie here at all -
  // see completeAdminTwoFactor below, the only path that sets one for them.
  @Post('admin/login')
  async adminLogin(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.adminLogin(dto);
    if ('twoFactorRequired' in result) return result;

    setAdminAuthCookies(res, result.accessToken);
    return { admin: result.admin };
  }

  // Tightened further than the controller default - this is the one place
  // a stolen password alone still isn't enough, so it's worth making a
  // 6-digit-code brute force even slower to attempt.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('admin/login/2fa')
  async completeAdminTwoFactor(@Body() dto: VerifyTwoFactorDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, admin } = await this.auth.completeAdminTwoFactor(dto.pendingToken, dto.code);
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
      select: { id: true, fullName: true, role: true, email: true, twoFactorEnabled: true },
    });
    return { admin };
  }

  // Self-service 2FA enrollment - any signed-in admin manages only their
  // own, never another admin's (that would need SuperAdminGuard, which this
  // deliberately doesn't use).
  @UseGuards(AdminAuthGuard)
  @Post('admin/2fa/setup')
  startTwoFactorSetup(@Req() req: { user: AdminJwtPayload }) {
    return this.auth.startTwoFactorSetup(req.user.sub);
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/2fa/enable')
  async enableTwoFactor(@Req() req: { user: AdminJwtPayload }, @Body() dto: TwoFactorCodeDto) {
    await this.auth.enableTwoFactor(req.user.sub, dto.code);
    return { success: true };
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/2fa/disable')
  async disableTwoFactor(@Req() req: { user: AdminJwtPayload }, @Body() dto: TwoFactorCodeDto) {
    await this.auth.disableTwoFactor(req.user.sub, dto.code);
    return { success: true };
  }
}
