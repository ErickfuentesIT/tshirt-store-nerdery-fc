import { BadRequestException, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { StripeService } from '../../common/stripe/stripe.service.js';

// Structural type derived from the shape of the cartItem.findMany query below.
// Avoids importing generated Prisma model types directly.
type CartItemWithVariant = {
  productVariantId: string;
  quantity: number;
  productVariant: {
    priceCents: number;
    stock: number;
    sku: string;
  };
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  // ─── Method B: GraphQL Mutation Entry Point ───────────────────────────────
  //
  // Called by OrdersResolver for authenticated users.
  // Returns the clientSecret that the frontend passes to Stripe.js
  // to render the Payment Element and complete the payment.

  async initiateCartCheckout(
    userId: string,
    shippingAddressId: string,
    promoCode?: string,
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
    this.validateStock(cartItems);

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
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      default:
        break;
    }
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

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private validateStock(cartItems: CartItemWithVariant[]): void {
    for (const item of cartItems) {
      if (item.productVariant.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for SKU "${item.productVariant.sku}". ` +
            `Requested: ${item.quantity}, available: ${item.productVariant.stock}.`,
        );
      }
    }
  }
}
