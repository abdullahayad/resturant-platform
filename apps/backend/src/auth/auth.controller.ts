import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

// Tighter than the app default — these are the highest-value brute-force
// targets in the app (see security review).
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('partner/login')
  partnerLogin(@Body() dto: LoginDto) {
    return this.auth.partnerLogin(dto);
  }

  @Post('staff/login')
  staffLogin(@Body() dto: LoginDto) {
    return this.auth.staffLogin(dto);
  }

  @Post('admin/login')
  adminLogin(@Body() dto: LoginDto) {
    return this.auth.adminLogin(dto);
  }
}
