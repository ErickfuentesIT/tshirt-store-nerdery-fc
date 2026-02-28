import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CustomConfigService } from './config.service.js';

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('CustomConfigService', () => {
  let service: CustomConfigService;
  let configGet: jest.Mock;
  let configGetOrThrow: jest.Mock;

  beforeEach(async () => {
    configGet = jest.fn();
    configGetOrThrow = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomConfigService,
        {
          provide: ConfigService,
          useValue: { get: configGet, getOrThrow: configGetOrThrow },
        },
      ],
    }).compile();

    service = module.get<CustomConfigService>(CustomConfigService);
  });

  // ── app ───────────────────────────────────────────────────────────────────

  describe('app', () => {
    it('should return parsed port from env', () => {
      configGet.mockReturnValue('4000');
      expect(service.app).toEqual({ port: 4000 });
      expect(configGet).toHaveBeenCalledWith('PORT', '3000');
    });

    it('should default to 3000 when PORT is not set', () => {
      configGet.mockReturnValue('3000');
      expect(service.app).toEqual({ port: 3000 });
    });
  });

  // ── db ────────────────────────────────────────────────────────────────────

  describe('db', () => {
    it('should return the database url', () => {
      configGet.mockReturnValue('postgresql://localhost/db');
      expect(service.db).toEqual({ url: 'postgresql://localhost/db' });
      expect(configGet).toHaveBeenCalledWith('DATABASE_URL');
    });
  });

  // ── auth ──────────────────────────────────────────────────────────────────

  describe('auth', () => {
    it('should return all JWT auth config values', () => {
      const values: Record<string, string> = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      configGetOrThrow.mockImplementation((key: string) => values[key]);

      expect(service.auth).toEqual({
        access_secret: 'access-secret',
        access_expires_in: '15m',
        refresh_secret: 'refresh-secret',
        refresh_expires_in: '7d',
      });
    });
  });

  // ── sendgrid ──────────────────────────────────────────────────────────────

  describe('sendgrid', () => {
    it('should return all SendGrid config values', () => {
      const values: Record<string, string> = {
        SENDGRID_API_KEY: 'sg-api-key',
        SENDGRID_FROM_EMAIL: 'no-reply@store.com',
        SENDGRID_LOW_STOCK_TEMPLATE_ID: 'd-low-stock',
        SENDGRID_FORGET_PASSWORD_TEMPLATE_ID: 'd-forget-password',
      };
      configGetOrThrow.mockImplementation((key: string) => values[key]);

      expect(service.sendgrid).toEqual({
        apiKey: 'sg-api-key',
        fromEmail: 'no-reply@store.com',
        lowStockTemplateId: 'd-low-stock',
        forgetPasswordTemplateId: 'd-forget-password',
      });
    });
  });

  // ── passwordReset ─────────────────────────────────────────────────────────

  describe('passwordReset', () => {
    it('should return the TTL from config', () => {
      configGet.mockReturnValue('30m');
      expect(service.passwordReset).toEqual({ ttl: '30m' });
      expect(configGet).toHaveBeenCalledWith('PASSWORD_RESET_TTL', '15m');
    });
  });

  // ── aws ───────────────────────────────────────────────────────────────────

  describe('aws', () => {
    it('should return all AWS config values', () => {
      const values: Record<string, string> = {
        AWS_REGIONS: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'access-key',
        AWS_SECRET_ACCESS_KEY: 'secret-key',
        AWS_S3_BUCKET_NAME: 'my-bucket',
      };
      configGetOrThrow.mockImplementation((key: string) => values[key]);

      expect(service.aws).toEqual({
        region: 'us-east-1',
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
        s3BucketName: 'my-bucket',
      });
    });
  });

  // ── stripe ────────────────────────────────────────────────────────────────

  describe('stripe', () => {
    it('should return stripe config values', () => {
      const values: Record<string, string> = {
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc',
      };
      configGetOrThrow.mockImplementation((key: string) => values[key]);

      expect(service.stripe).toEqual({
        secretKey: 'sk_test_123',
        webhookSecret: 'whsec_abc',
      });
    });
  });

  // ── redis ─────────────────────────────────────────────────────────────────

  describe('redis', () => {
    it('should return parsed redis host and port', () => {
      const values: Record<string, string> = {
        REDIS_HOST: 'redis-host',
        REDIS_PORT: '6380',
      };
      configGet.mockImplementation((key: string, fallback?: string) => values[key] ?? fallback);

      expect(service.redis).toEqual({ host: 'redis-host', port: 6380 });
    });

    it('should default to localhost:6379 when env vars are not set', () => {
      configGet.mockImplementation((_key: string, fallback?: string) => fallback);

      expect(service.redis).toEqual({ host: 'localhost', port: 6379 });
    });
  });

  // ── cors ──────────────────────────────────────────────────────────────────

  describe('cors', () => {
    it('should return an array of origins when ALLOWED_ORIGINS is set', () => {
      configGet.mockReturnValue('http://localhost:3000, http://localhost:4000');

      expect(service.cors).toEqual({
        origins: ['http://localhost:3000', 'http://localhost:4000'],
      });
    });

    it('should return true when ALLOWED_ORIGINS is empty', () => {
      configGet.mockReturnValue('');

      expect(service.cors).toEqual({ origins: true });
    });
  });
});
