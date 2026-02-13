import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersModule } from '../users/users.module.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { CustomConfigModule } from '../../config/config.module.js';
import { CustomConfigService } from '../../config/config.service.js';
import { RefreshJwtStrategy } from './strategies/refresh.strategy.js';
import { ConfigModule } from '@nestjs/config';
import { TokensModule } from '../tokens/tokens.module.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [
    UsersModule,
    CustomConfigModule,
    TokensModule,
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
  providers: [AuthService, JwtStrategy, RefreshJwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
