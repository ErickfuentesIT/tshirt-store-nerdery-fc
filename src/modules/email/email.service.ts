import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';
import { CustomConfigService } from '../../config/config.service.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name); // TODO: APPLY DI HERE!

  constructor(private readonly configService: CustomConfigService) {
    sgMail.setApiKey(this.configService.sendgrid.apiKey);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const msg = {
      to,
      from: this.configService.sendgrid.fromEmail,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Use this token to reset your password: ${token}. This token expires in 15 minutes.`,
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Use the token below to reset your password:</p>
        <p><strong>${token}</strong></p>
        <p>This token expires in ${this.configService.passwordReset.ttl}.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
    }
  }
}
