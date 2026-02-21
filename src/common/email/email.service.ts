import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';
import { CustomConfigService } from '../config/config.service.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name); // TODO: APPLY DI HERE!

  constructor(private readonly configService: CustomConfigService) {
    sgMail.setApiKey(this.configService.sendgrid.apiKey);
  }

  async sendLowStockEmail(
    to: string,
    username: string,
    productName: string,
    priceCents: number,
    paymentLinkUrl: string | null,
    imageUrl: string | null,
  ): Promise<void> {
    const body = {
      from: this.configService.sendgrid.fromEmail,
      personalizations: [
        {
          to,
          dynamic_template_data: {
            username,
            product_name: productName,
            image_url:    imageUrl ?? '',
            price:        (priceCents / 100).toFixed(2),
            payment_link_url: paymentLinkUrl ?? '',
          },
        },
      ],
      templateId: this.configService.sendgrid.lowStockTemplateId,
    };

    try {
      await sgMail.send(body);
      this.logger.log(`Low-stock email sent to ${to} for "${productName}"`);
    } catch (error) {
      this.logger.error(
        `Failed to send low-stock email to ${to} for "${productName}"`,
        error,
      );
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {

    const forgetPasswordBody = {
      from: this.configService.sendgrid.fromEmail,
      personalizations: [
        {
          to,
          dynamic_template_data: {
            reset_token: token,
            expiration_time: this.configService.passwordReset.ttl,
          },
        },
      ],
      templateId: this.configService.sendgrid.forgetPasswordTemplateId,
    };

    try {
      await sgMail.send(forgetPasswordBody);
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
    }
  }
}
