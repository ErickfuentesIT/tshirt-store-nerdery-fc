import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';
import { CustomConfigService } from '../config/config.service.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name); // TODO: APPLY DI HERE!

  constructor(private readonly configService: CustomConfigService) {
    sgMail.setApiKey(this.configService.sendgrid.apiKey);
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
      templateId: 'd-92ccd7cec3a34854b0ad2a192a5359f8',
    };

    try {
      await sgMail.send(forgetPasswordBody);
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
    }
  }
}
