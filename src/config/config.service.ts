import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
      secret: this.configService.get<string>('JWT_SECRET'),
    };
  }
}
