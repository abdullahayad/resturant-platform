import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { AppJwtPayload } from '../jwt-payload';
import { requireJwtSecret } from '../jwt-secret';
import { ADMIN_TOKEN_COOKIE } from '../../common/adminAuthCookies';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // The partner app and admin portal authenticate differently: the
      // partner app still sends its token as a normal Authorization header
      // (it's a native app, not a browser page - the XSS risk cookies solve
      // for admin doesn't apply there, and it already moved its token into
      // the phone's secure storage). The admin portal now sends its token
      // as an httpOnly cookie instead (see adminAuthCookies.ts) - trying the
      // header first, then falling back to the cookie, lets one strategy
      // serve both without either ever colliding with the other.
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req?.cookies?.[ADMIN_TOKEN_COOKIE] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(),
    });
  }

  validate(payload: AppJwtPayload): AppJwtPayload {
    return payload;
  }
}
