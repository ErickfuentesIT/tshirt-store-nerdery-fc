import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';
@Injectable()
export class CustomConfigService {
  constructor(private readonly configService: ConfigService) {}

  get app() {
    return {
      port: this.configService.get<number>('PORT', { infer: true }),
    };
  }

  get db() {
    return {
      url: this.configService.get<string>('DATABASE_URL'),
    };
  }

  get auth() {
    return {
      access_secret: this.configService.getOrThrow<string>(
        'JWT_ACCESS_SECRET',
      ) as StringValue,
      access_expires_in: this.configService.getOrThrow<string>(
        'JWT_ACCESS_EXPIRES_IN',
      ) as StringValue,
      refresh_secret: this.configService.getOrThrow<string>(
        'JWT_REFRESH_SECRET',
      ) as StringValue,
      refresh_expires_in: this.configService.getOrThrow<string>(
        'JWT_REFRESH_EXPIRES_IN',
      ) as StringValue,
    };
  }
}
export { ConfigService };
