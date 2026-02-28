jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import sgMail from '@sendgrid/mail';

import { EmailService } from './email.service.js';
import { CustomConfigService } from '../config/config.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockConfigService = {
  sendgrid: {
    apiKey: 'sg-api-key',
    fromEmail: 'no-reply@store.com',
    lowStockTemplateId: 'd-low-stock',
    forgetPasswordTemplateId: 'd-forget-password',
  },
  passwordReset: { ttl: '15m' },
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('EmailService', () => {
  let service: EmailService;
  let sendMock: jest.Mock;

  beforeEach(async () => {
    sendMock = sgMail.send as jest.Mock;
    sendMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: CustomConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should call sgMail.setApiKey with the configured API key on init', () => {
    expect(sgMail.setApiKey as jest.Mock).toHaveBeenCalledWith(mockConfigService.sendgrid.apiKey);
  });

  // ── sendLowStockEmail ─────────────────────────────────────────────────────

  describe('sendLowStockEmail', () => {
    const to = 'user@example.com';

    it('should call sgMail.send with the correct payload', async () => {
      sendMock.mockResolvedValue([{ statusCode: 202 }, {}]);

      await service.sendLowStockEmail(
        to,
        'johndoe',
        'Cool T-Shirt',
        1999,
        'https://buy.stripe.com/link',
        'https://img.url/shirt.jpg',
      );

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          from: mockConfigService.sendgrid.fromEmail,
          templateId: mockConfigService.sendgrid.lowStockTemplateId,
          personalizations: [
            expect.objectContaining({
              to,
              dynamic_template_data: expect.objectContaining({
                username: 'johndoe',
                product_name: 'Cool T-Shirt',
                price: '19.99',
                payment_link_url: 'https://buy.stripe.com/link',
                image_url: 'https://img.url/shirt.jpg',
              }),
            }),
          ],
        }),
      );
    });

    it('should use empty strings when imageUrl and paymentLinkUrl are null', async () => {
      sendMock.mockResolvedValue([{ statusCode: 202 }, {}]);

      await service.sendLowStockEmail(to, 'johndoe', 'Cool T-Shirt', 1999, null, null);

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          personalizations: [
            expect.objectContaining({
              dynamic_template_data: expect.objectContaining({
                image_url: '',
                payment_link_url: '',
              }),
            }),
          ],
        }),
      );
    });

    it('should not throw when sgMail.send rejects', async () => {
      sendMock.mockRejectedValue(new Error('SendGrid network error'));

      await expect(
        service.sendLowStockEmail(to, 'johndoe', 'Cool T-Shirt', 1999, null, null),
      ).resolves.toBeUndefined();
    });
  });

  // ── sendPasswordResetEmail ────────────────────────────────────────────────

  describe('sendPasswordResetEmail', () => {
    const to = 'user@example.com';

    it('should call sgMail.send with the correct payload', async () => {
      sendMock.mockResolvedValue([{ statusCode: 202 }, {}]);

      await service.sendPasswordResetEmail(to, 'reset-token-abc');

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          from: mockConfigService.sendgrid.fromEmail,
          templateId: mockConfigService.sendgrid.forgetPasswordTemplateId,
          personalizations: [
            expect.objectContaining({
              to,
              dynamic_template_data: expect.objectContaining({
                reset_token: 'reset-token-abc',
                expiration_time: mockConfigService.passwordReset.ttl,
              }),
            }),
          ],
        }),
      );
    });

    it('should not throw when sgMail.send rejects', async () => {
      sendMock.mockRejectedValue(new Error('SendGrid network error'));

      await expect(
        service.sendPasswordResetEmail(to, 'reset-token-abc'),
      ).resolves.toBeUndefined();
    });
  });
});
