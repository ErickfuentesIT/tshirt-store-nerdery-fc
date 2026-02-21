import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CustomConfigService } from '../../../common/config/config.service.js';
import { AuthJwtPayload } from '../types/auth-jwt-payload.type.js';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private customConfigService: CustomConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: customConfigService.auth.access_secret,
    });
  }
  async validate(payload: AuthJwtPayload) {
    return {
      userId: payload.id,
      username: payload.username,
      role: payload.role,
    };
  }
}
