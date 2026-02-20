import { BadRequestException, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { StripeService } from '../../common/stripe/stripe.service.js';
import { validateStock } from './helpers/validate-stock.helper.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  // ─── Queries ──────────────────────────────────────────────────────────────

  findAll() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Method B: GraphQL Mutation Entry Point ───────────────────────────────
  //
  // Called by OrdersResolver for authenticated users.
  // Returns the clientSecret that the frontend passes to Stripe.js
  // to render the Payment Element and complete the payment.

  async initiateCartCheckout(
    userId: string,
    shippingAddressId: string,
    _promoCode?: string,
  ): Promise<{ clientSecret: string; orderId: string }> {
    // 1. Fetch user and cart contents in a single round-trip to the DB.
    //    We need the user for their email (customer creation) and their
    //    existing stripeCustomerId (to avoid creating duplicates).
    const [user, cartItems] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.cartItem.findMany({
        where: { userId },
        include: { productVariant: true },
      }),
    ]);

    // 2. Guard: a PaymentIntent for zero items makes no sense.
    if (cartItems.length === 0) {
      throw new BadRequestException('Your cart is empty.');
    }

    // 3. Guard: validate stock for every item before touching Stripe.
    //    Throws immediately on the first item that cannot be fulfilled.
    validateStock(cartItems);

    // 4. Calculate the order total in cents — the only unit Stripe accepts.
    const totalAmountCents = cartItems.reduce(
      (sum, item) => sum + item.productVariant.priceCents * item.quantity,
      0,
    );

    // 5. Just-In-Time Stripe Customer creation.
    //    We only create a Customer object in Stripe the very first time a user
    //    checks out. After that, their ID is stored in our DB and reused.
    //    This avoids polluting Stripe with duplicate customer records.
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripeService.createCustomer(
        user.email,
        user.username,
      );
      stripeCustomerId = customer.id;

      // Persist immediately so concurrent requests cannot create a second customer.
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });
    }

    // 6. Write the Order to our DB *before* calling Stripe.
    //    This guarantees we always have an orderId to embed in the
    //    PaymentIntent metadata. If Stripe is temporarily unavailable,
    //    the DB write is rolled back naturally (it hasn't been committed yet).
    const order = await this.prisma.order.create({
      data: {
        userId,
        shippingAddressId,
        totalAmountCents,
        discountAmountCents: 0,
        paymentMethodType: 'payment_intent',
        currentStatus: 'pending',
        // Snapshot the cart as immutable line items on the order.
        // We store priceCents at this moment in time so future price
        // changes on the variant never affect historical order data.
        items: {
          create: cartItems.map((item) => ({
            variantId: item.productVariantId,
            quantity: item.quantity,
            priceAtPurchaseCents: item.productVariant.priceCents,
          })),
        },
        // Seed the event-sourcing status timeline.
        statuses: {
          create: { status: 'pending' },
        },
      },
    });

    // 7. Create the Stripe PaymentIntent.
    //    - customer: links this payment to the Stripe Customer object,
    //      enabling saved payment methods and the Customer Portal.
    //    - metadata.orderId: this is the critical bridge. When the
    //      payment_intent.succeeded webhook fires, we use this value
    //      to look up the exact order row in our DB.
    const paymentIntent = await this.stripeService.createPaymentIntent(
      totalAmountCents,
      'usd',
      stripeCustomerId,
      { orderId: order.id, userId },
    );

    // 8. Stamp the Stripe PaymentIntent ID onto the order so we can
    //    look it up from both sides (DB → Stripe and Stripe → DB).
    await this.prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      orderId: order.id,
    };
  }

  // ─── Webhook Event Dispatcher ─────────────────────────────────────────────
  //
  // Called by WebhookController after signature verification.
  // Routes verified Stripe events to the appropriate handler.
  // Unrecognised event types are intentionally ignored — never throw here,
  // as that would cause Stripe to retry the delivery repeatedly.

  async handleStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      default:
        break;
    }
  }

  // ─── Method A: Webhook Handler ────────────────────────────────────────────
  //
  // Fired by Stripe after a Payment Link checkout completes.
  // Handles both registered users and anonymous guests.

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    // Idempotency guard — stripeCheckoutSessionId has a @unique constraint,
    // so a second attempt to insert the same value will throw a P2002.
    // We check explicitly here to return cleanly instead of crashing.
    const existing = await this.prisma.order.findUnique({
      where: { stripeCheckoutSessionId: session.id },
    });
    if (existing) return;

    // The webhook payload does not include line_items. Re-fetch with expand
    // so we can read the stripe_price_id to identify the ProductVariant.
    const fullSession = await this.stripeService.retrieveCheckoutSession(
      session.id,
    );

    const stripePriceId = fullSession.line_items?.data[0]?.price?.id;
    if (!stripePriceId) {
      throw new Error(
        `checkout.session.completed: no price ID in session ${session.id}`,
      );
    }

    // Identify which ProductVariant was purchased via the Payment Link.
    const variant = await this.prisma.productVariant.findUnique({
      where: { stripePriceId },
    });
    if (!variant) {
      throw new Error(
        `checkout.session.completed: no variant found for price ${stripePriceId}`,
      );
    }

    // ── User resolution ──────────────────────────────────────────────────────
    // If the buyer's email matches a registered account we link the order to
    // their userId. Otherwise the order is stored as a guest purchase.
    const email = fullSession.customer_details?.email ?? null;
    const registeredUser = email
      ? await this.prisma.user.findUnique({ where: { email } })
      : null;

    // ── Shipping address extraction ──────────────────────────────────────────
    // Stripe populates shipping_details because we set
    // shipping_address_collection on the PaymentLink at creation time.
    // In Stripe API 2025-01-27 (used by stripe@^20), shipping_details was
    // moved from a top-level field to collected_information.shipping_details.
    const shippingDetails = fullSession.collected_information?.shipping_details;
    const address = shippingDetails?.address;
    if (!address) {
      throw new Error(
        `checkout.session.completed: no shipping address in session ${session.id}`,
      );
    }

    // The PaymentIntent ID stored here is the payment_attempt reference used
    // for financial reporting and potential refunds.
    const paymentIntentId =
      typeof fullSession.payment_intent === 'string'
        ? fullSession.payment_intent
        : (fullSession.payment_intent?.id ?? null);

    // ── Atomic transaction ───────────────────────────────────────────────────
    await this.prisma.$transaction(async (tx) => {
      // a. Re-read the variant inside the transaction to acquire a row-level
      //    lock and get the latest stock value, preventing race conditions
      //    between concurrent webhook deliveries for the same variant.
      const lockedVariant = await tx.productVariant.findUnique({
        where: { id: variant.id },
      });
      if (!lockedVariant || lockedVariant.stock <= 0) {
        throw new BadRequestException(
          `SKU "${variant.sku}" is out of stock. The order cannot be fulfilled.`,
        );
      }

      // a. Decrement stock by exactly 1 (Payment Links are single-unit).
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stock: { decrement: 1 } },
      });

      // b. Create the ShippingAddress row first so we have its ID.
      //    Prisma disallows mixing a raw FK field (userId) with a nested
      //    relation create (shippingAddress: { create }) in the same write
      //    because they belong to mutually exclusive input types.
      //    Splitting into two sequential writes inside the same transaction
      //    keeps everything atomic without triggering that conflict.
      const savedAddress = await tx.shippingAddress.create({
        data: {
          userId: registeredUser?.id ?? null,
          recipientName: shippingDetails?.name ?? 'N/A',
          // Phone is not collected by Payment Links by default.
          phoneNumber: fullSession.customer_details?.phone ?? 'N/A',
          street: address.line1!,
          city: address.city!,
          state: address.state!,
          country: address.country!,
          additionalDescription: address.line2 ?? null,
        },
      });

      // c–f. Create the order and all child records.
      await tx.order.create({
        data: {
          // Registered user or guest — mutually exclusive.
          userId: registeredUser?.id ?? null,
          guestEmail: registeredUser ? null : email,

          shippingAddressId: savedAddress.id,
          stripeCheckoutSessionId: session.id,
          paymentMethodType: 'payment_link',
          currentStatus: 'paid',
          totalAmountCents: fullSession.amount_total!,
          discountAmountCents: 0,

          // c. Snapshot the purchased item as an immutable OrderItem.
          items: {
            create: {
              variantId: variant.id,
              quantity: 1,
              priceAtPurchaseCents: variant.priceCents,
            },
          },

          // d. Seed the event-sourcing status log.
          statuses: {
            create: { status: 'paid' },
          },

          // e. Record the confirmed payment for financial reporting.
          payments: {
            create: {
              stripePaymentAttemptId: paymentIntentId,
              amountCents: fullSession.amount_total!,
              currency: fullSession.currency!,
              status: 'succeeded',
            },
          },
        },
      });
    });
  }

  // ─── Method B: Webhook Handler ────────────────────────────────────────────
  //
  // Stripe guarantees at-least-once delivery, never exactly-once.
  // This method must therefore be fully idempotent.

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const orderId = paymentIntent.metadata?.orderId;

    // PaymentIntents not originating from our app (e.g. Stripe dashboard
    // test events) will have no orderId in their metadata. Safe to ignore.
    if (!orderId) return;

    // Idempotency guard: if we have already processed this event and
    // marked the order as paid, do nothing. This handles Stripe retries.
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.currentStatus === 'paid') return;

    // Everything below runs inside a single Postgres transaction.
    // If any operation throws, the entire block is rolled back atomically.
    // This is critical: we must never decrement stock without also marking
    // the order as paid, and vice versa.
    await this.prisma.$transaction(async (tx) => {
      const orderItems = await tx.orderItem.findMany({ where: { orderId } });

      // a. Decrement stock for each variant.
      //    Each update is its own statement inside the transaction,
      //    so concurrent checkouts for the same variant are serialized
      //    by Postgres row-level locks.
      for (const item of orderItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // b. Promote the order's current status to PAID.
      await tx.order.update({
        where: { id: orderId },
        data: { currentStatus: 'paid' },
      });

      // c. Append an immutable entry to the order_statuses event log.
      //    This gives you a full, auditable history of every state
      //    transition an order has ever gone through.
      await tx.orderStatus.create({
        data: { orderId, status: 'paid' },
      });

      // d. Record the confirmed payment as its own entity.
      //    The Payment row is the source of truth for financial reporting.
      await tx.payment.create({
        data: {
          orderId,
          stripePaymentAttemptId: paymentIntent.id,
          amountCents: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: 'succeeded',
        },
      });

      // e. Clear the buyer's cart now that the order is confirmed.
      const userId = paymentIntent.metadata?.userId;
      if (userId) {
        await tx.cartItem.deleteMany({ where: { userId } });
      }
    });
  }
}
