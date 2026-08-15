import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('partner/login')
  partnerLogin(@Body() dto: LoginDto) {
    return this.auth.partnerLogin(dto);
  }

  @Post('admin/login')
  adminLogin(@Body() dto: LoginDto) {
    return this.auth.adminLogin(dto);
  }
}
