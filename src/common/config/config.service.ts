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

  get sendgrid() {
    return {
      apiKey: this.configService.getOrThrow<string>('SENDGRID_API_KEY'),
      fromEmail: this.configService.getOrThrow<string>('SENDGRID_FROM_EMAIL'),
    };
  }

  get passwordReset() {
    return {
      ttl: this.configService.get<string>('PASSWORD_RESET_TTL', '15m'),
    };
  }

  get aws() {
    return {
      region: this.configService.getOrThrow<string>('AWS_REGIONS'),
      accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey:
        this.configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      s3BucketName:
        this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME'),
    };
  }

  get stripe() {
    return {
      secretKey: this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
      webhookSecret: this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
    };
  }

  get redis() {
    return {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
    };
  }
}
export { ConfigService };
