import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { CustomConfigService } from '../config/config.service.js';

@Injectable()
export class StripeService {
  readonly client: Stripe;
  readonly webhookSecret: string;

  constructor(private readonly configService: CustomConfigService) {
    const { secretKey, webhookSecret } = this.configService.stripe;

    this.client = new Stripe(secretKey);
    this.webhookSecret = webhookSecret;
  }
}
