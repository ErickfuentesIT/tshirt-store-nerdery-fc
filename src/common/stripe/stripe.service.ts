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

  createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    return this.client.customers.create({ email, name });
  }

  createPaymentIntent(
    amountCents: number,
    currency: string,
    customerId: string,
    metadata: Record<string, string>,
  ): Promise<Stripe.PaymentIntent> {
    return this.client.paymentIntents.create({
      amount: amountCents,
      currency,
      customer: customerId,
      metadata,
      automatic_payment_methods: { enabled: true },
    });
  }

  verifyWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.client.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }
}
