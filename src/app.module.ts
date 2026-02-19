import { join } from 'path';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule } from '@nestjs/throttler';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard.js';
import { CustomConfigModule } from './common/config/config.module.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { SerializeInterceptor } from './common/interceptors/serialize.interceptor.js';
import { ProductsModule } from './modules/products/products.module.js';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { LikesModule } from './modules/likes/likes.module.js';
import { CartModule } from './modules/cart/cart.module.js';
import { S3Module } from './common/s3/s3.module.js';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter.js';
@Module({
  imports: [
    CustomConfigModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault() as any], // Enable the Apollo Sandbox landing page
      context: ({ req, res }) => ({ req, res }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 60000, limit: 10 }, // Only 3 requests per minute - DEFAULT
        { name: 'long', ttl: 3600000, limit: 100 }, // 10 requests per hour - DEFAULT
      ],
    }),
    PrismaModule,
    S3Module,
    UsersModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    LikesModule,
    CartModule,
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
    {
      provide: APP_FILTER,
      useClass: PrismaClientExceptionFilter,
    },
  ],
})
export class AppModule {}
