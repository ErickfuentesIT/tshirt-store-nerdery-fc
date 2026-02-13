import { join } from 'path';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule } from '@nestjs/throttler';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard.js';
import { CustomConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { SerializeInterceptor } from './common/interceptors/serialize.interceptor.js';
import { TokensModule } from './modules/tokens/tokens.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    CustomConfigModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      context: ({ req, res }) => ({ req, res }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 60000, limit: 10 }, // Only 3 requests per minute - DEFAULT
        { name: 'long', ttl: 3600000, limit: 100 }, // 10 requests per hour - DEFAULT
      ],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    TokensModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SerializeInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
  ],
})
export class AppModule {}
