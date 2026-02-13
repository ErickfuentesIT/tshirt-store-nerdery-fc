import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppService } from './app.service.js';
import { CustomConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { SerializeInterceptor } from './common/interceptors/serialize.interceptor.js';
import { TokensModule } from './modules/tokens/tokens.module.js';

@Module({
  imports: [
    CustomConfigModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    TokensModule,
  ],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: SerializeInterceptor,
    },
  ],
})
export class AppModule {}
