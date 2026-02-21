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

  // ─── Method A: Payment Link creation ────────────────────────────────────────

  async generateVariantStripeData(
    productName: string,
    priceCents: number,
    images: string[],
  ): Promise<{
    stripeProductId: string;
    stripePriceId: string;
    stripePaymentLinkId: string;
    stripePaymentLinkUrl: string;
  }> {
    const product = await this.client.products.create({
      name: productName,
      images,
    });

    const price = await this.client.prices.create({
      product: product.id,
      unit_amount: priceCents,
      currency: 'usd',
    });
    const paymentLink = await this.client.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      shipping_address_collection: {
        allowed_countries: ['US', 'MX', 'CA'],
      },
    });

    return {
      stripeProductId: product.id,
      stripePriceId: price.id,
      stripePaymentLinkId: paymentLink.id,
      stripePaymentLinkUrl: paymentLink.url,
    };
  }

  // ─── Method A: Webhook helper ────────────────────────────────────────────────

  retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return this.client.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'line_items.data.price'],
    });
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

  async deactivateVariantStripeData(
    items: Array<{
      stripeProductId: string;
      stripePriceId: string;
      stripePaymentLinkId: string;
    }>,
  ): Promise<void> {
    await Promise.all(
      items.flatMap(({ stripeProductId, stripePriceId, stripePaymentLinkId }) => [
        this.client.products.update(stripeProductId, { active: false }),
        this.client.prices.update(stripePriceId, { active: false }),
        this.client.paymentLinks.update(stripePaymentLinkId, { active: false }),
      ]),
    );
  }

  verifyWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.client.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }
}
