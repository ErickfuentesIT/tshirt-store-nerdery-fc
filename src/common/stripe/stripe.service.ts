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
  //
  // Called once when a manager creates a product variant.
  // Creates three linked Stripe objects in sequence:
  //   Product → Price → PaymentLink
  // The returned IDs are persisted on the ProductVariant row so the shareable
  // URL is always available without another Stripe API call.

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
    // 1. Create the Stripe Product — images are shown on the hosted payment page.
    const product = await this.client.products.create({
      name: productName,
      images,
    });

    // 2. Create a Price tied to this product.
    //    unit_amount is always in the smallest currency unit (cents for USD).
    //    'one_time' is implicit when recurring is omitted.
    const price = await this.client.prices.create({
      product: product.id,
      unit_amount: priceCents,
      currency: 'usd',
    });

    // 3. Create the PaymentLink.
    //    shipping_address_collection tells Stripe to render an address form
    //    on the hosted checkout page and include the result in the
    //    checkout.session.completed webhook payload under shipping_details.
    const paymentLink = await this.client.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      shipping_address_collection: {
        // Add more country codes as your business expands.
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
  //
  // The checkout.session.completed webhook payload does NOT include line_items
  // by default. We must re-fetch the session from Stripe with the expand param
  // to get the stripe_price_id needed to identify the ProductVariant.

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

  // Deactivates all Stripe objects that were created for a variant whose
  // DB transaction subsequently failed. Called in the catch block of
  // ProductsService to prevent orphaned Stripe records.
  // Errors are intentionally NOT thrown — the caller logs and re-throws
  // the original DB error so the API response reflects the true failure.
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
