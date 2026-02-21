import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CustomConfigService } from '../../../common/config/config.service.js';
import { RefreshJwtPayload } from '../types/refresh-jwt-payload.type.js';
@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'refresh-jwt',
) {
  constructor(private customConfigService: CustomConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: customConfigService.auth.refresh_secret,
    });
  }
  async validate(payload: RefreshJwtPayload) {
    return {
      id: payload.id,
      jti: payload.jti,
    };
  }
}
