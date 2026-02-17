import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './services/auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersModule } from '../users/users.module.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { CustomConfigModule } from '../../common/config/config.module.js';
import { CustomConfigService } from '../../common/config/config.service.js';
import { RefreshJwtStrategy } from './strategies/refresh.strategy.js';
import { TokensService } from './services/tokens.service.js';
import { EmailModule } from '../../common/email/email.module.js';

@Module({
  imports: [
    UsersModule,
    CustomConfigModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [CustomConfigModule],
      useFactory: (configService: CustomConfigService) => ({
        secret: configService.auth.access_secret,
        signOptions: {
          expiresIn: configService.auth.access_expires_in,
        },
      }),
      inject: [CustomConfigService],
    }),
  ],
  providers: [AuthService, TokensService, JwtStrategy, RefreshJwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
