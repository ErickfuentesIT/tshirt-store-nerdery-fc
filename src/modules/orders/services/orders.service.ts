import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { MyOrdersFilterInput } from '../dto/my-orders-filter.input.js';
import type { AssignDeliveryInput } from '../dto/assign-delivery.input.js';
import type { LowStockNotificationJob } from '../types/stock-notification-job.type.js';
import Stripe from 'stripe';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { StripeService } from '../../../common/stripe/stripe.service.js';
import { validateStock } from '../helpers/validate-stock.helper.js';
import { StockNotificationService } from '../services/stock-notification.service.js';
import { PromoCodesService } from '../../promo-codes/promo-codes.service.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly stockNotificationService: StockNotificationService,
    private readonly promoCodesService: PromoCodesService,
  ) {}

  // ─── Queries ──────────────────────────────────────────────────────────────

  findAll() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findAllForUser(userId: string, filters: MyOrdersFilterInput = {}) {
    const {
      fromDate,
      toDate,
      status,
      minAmountCents,
      maxAmountCents,
      limit = 10,
      offset = 0,
    } = filters;

    return this.prisma.order.findMany({
      where: {
        userId,
        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
        ...(status ? { currentStatus: status } : {}),
        ...(minAmountCents !== undefined || maxAmountCents !== undefined
          ? {
              totalAmountCents: {
                ...(minAmountCents !== undefined
                  ? { gte: minAmountCents }
                  : {}),
                ...(maxAmountCents !== undefined
                  ? { lte: maxAmountCents }
                  : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  // ─── Manager Mutations ────────────────────────────────────────────────────

  async assignDeliveryAndMarkProcessing(
    input: AssignDeliveryInput,
    _managerId: string,
  ): Promise<number> {
    const { assignedDeliveryId, orderIds } = input;

    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, currentStatus: true },
    });

    if (orders.length !== orderIds.length) {
      const foundIds = new Set(orders.map((o) => o.id));
      const missing = orderIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `The following order IDs were not found: ${missing.join(', ')}`,
      );
    }

    const nonPaid = orders.filter((o) => o.currentStatus !== 'paid');
    if (nonPaid.length > 0) {
      throw new BadRequestException(
        `All orders must have status 'paid' before assignment. ` +
          `Invalid orders: ${nonPaid.map((o) => o.id).join(', ')}`,
      );
    }

    await this.prisma.$transaction([

      this.prisma.order.updateMany({
        where: { id: { in: orderIds } },
        data: { currentStatus: 'processing', assignedDeliveryId },
      }),

      this.prisma.orderStatus.createMany({
        data: orderIds.map((orderId) => ({
          orderId,
          status: 'processing' as const,
        })),
      }),
    ]);

    return orderIds.length;
  }

  async markOrderAsShipped(orderId: string, _managerId: string) {

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, currentStatus: true },
    });

    if (!order) {
      throw new NotFoundException(`Order "${orderId}" not found.`);
    }

    if (order.currentStatus !== 'processing') {
      const reason: Record<string, string> = {
        pending: 'it has not been paid yet',
        paid: 'it has been paid but not yet assigned to a delivery driver — run markOrdersAsProcessing first',
        shipped: 'it has already been shipped',
        delivered: 'it has already been delivered',
        cancelled: 'it has been cancelled and cannot be fulfilled',
      };

      throw new BadRequestException(
        `Order "${orderId}" cannot be marked as shipped because ` +
          (reason[order.currentStatus] ??
            `its current status is "${order.currentStatus}"`),
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { currentStatus: 'shipped' },
      });

      // b. Append an immutable entry to the event-sourcing status timeline.
      //    Note: managerId is not stored here because the OrderStatus schema
      //    has no `updatedBy` column — add that migration first if needed.
      await tx.orderStatus.create({
        data: { orderId, status: 'shipped' },
      });

      return updated;
    });
  }

  // ─── Delivery Person Methods ──────────────────────────────────────────────

  getMyAssignedDeliveries(deliveryPersonId: string) {
    return this.prisma.order.findMany({
      where: {
        assignedDeliveryId: deliveryPersonId,
        currentStatus: 'shipped',
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async markOrderAsDelivered(orderId: string, deliveryPersonId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, currentStatus: true, assignedDeliveryId: true },
    });

    if (!order) {
      throw new NotFoundException(`Order "${orderId}" not found.`);
    }

    if (order.assignedDeliveryId !== deliveryPersonId) {
      throw new UnauthorizedException(
        `You are not the assigned delivery person for order "${orderId}".`,
      );
    }

    if (order.currentStatus !== 'shipped') {
      const reason: Record<string, string> = {
        pending: 'it has not been paid yet',
        paid: 'it has not been assigned to a delivery driver yet',
        processing:
          'it has been assigned but not yet dispatched — wait for it to be marked shipped',
        delivered: 'it has already been delivered',
        cancelled: 'it has been cancelled',
      };

      throw new BadRequestException(
        `Order "${orderId}" cannot be marked as delivered because ` +
          (reason[order.currentStatus] ??
            `its current status is "${order.currentStatus}"`),
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { currentStatus: 'delivered' },
      });

      await tx.orderStatus.create({
        data: { orderId, status: 'delivered' },
      });

      return updated;
    });
  }

  // ─── Client Mutations ─────────────────────────────────────────────────────

  async cancelOrder(orderId: string, clientId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, currentStatus: true },
    });

    if (!order) {
      throw new NotFoundException(`Order "${orderId}" not found.`);
    }

    if (order.userId !== clientId) {
      throw new ForbiddenException(
        'You do not have permission to cancel this order.',
      );
    }

    const nonCancellableStatuses: string[] = [
      'shipped',
      'delivered',
      'cancelled',
    ];

    if (nonCancellableStatuses.includes(order.currentStatus)) {
      const reason: Record<string, string> = {
        shipped: 'it has already been shipped and is out for delivery',
        delivered: 'it has already been delivered',
        cancelled: 'it has already been cancelled',
      };

      throw new BadRequestException(
        `Order "${orderId}" cannot be cancelled because ` +
          (reason[order.currentStatus] ??
            `its current status is "${order.currentStatus}"`),
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { currentStatus: 'cancelled' },
      });

      await tx.orderStatus.create({
        data: { orderId, status: 'cancelled' },
      });

      return updated;
    });
  }

  // ─── Webhook Event Dispatcher ─────────────────────────────────────────────

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

  // ─── Payment Intent Method ───────────────────────────────

  async initiateCartCheckout(
    userId: string,
    shippingAddressId: string,
    promoCode?: string,
  ): Promise<{ clientSecret: string; orderId: string }> {

    const [user, cartItems] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.cartItem.findMany({
        where: { userId },
        include: { productVariant: true },
      }),
    ]);

    if (cartItems.length === 0) {
      throw new BadRequestException('Your cart is empty.');
    }
    validateStock(cartItems);

    const totalAmountCents = cartItems.reduce(
      (sum, item) => sum + item.productVariant.priceCents * item.quantity,
      0,
    );

    // Validate the promo code and calculate the discount against the cart.
    // Throws BadRequestException for any invalid/expired/out-of-scope code.
    let discountAmountCents = 0;
    if (promoCode) {
      const items = cartItems.map((item) => ({
        productId: item.productVariant.productId,
        variantId: item.productVariantId,
        priceCents: item.productVariant.priceCents,
        quantity: item.quantity,
      }));
      const result = await this.promoCodesService.validateAndCalculateDiscount(
        promoCode,
        items,
      );
      discountAmountCents = result.totalDiscountCents;
    }

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripeService.createCustomer(
        user.email,
        user.username,
      );
      stripeCustomerId = customer.id;

      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });
    }

    // Generate the orderId upfront so it can be embedded in the Stripe
    // PaymentIntent metadata before the order row exists in the DB.
    // This eliminates the extra order.update() that previously stamped
    // stripePaymentIntentId after the fact.
    const orderId = randomUUID();
    const chargeAmountCents = totalAmountCents - discountAmountCents;

    const paymentIntent = await this.stripeService.createPaymentIntent(
      chargeAmountCents,
      'usd',
      stripeCustomerId,
      { orderId, userId },
    );

    // Atomically create the order and increment the promo code usage counter.
    // If either write fails the whole transaction rolls back, preventing
    // an order from existing without its discount or the usedCount from
    // being inflated for an order that was never persisted.
    await this.prisma.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          id: orderId,
          userId,
          shippingAddressId,
          totalAmountCents,
          discountAmountCents,
          stripePaymentIntentId: paymentIntent.id,
          paymentMethodType: 'payment_intent',
          currentStatus: 'pending',
          items: {
            create: cartItems.map((item) => ({
              variantId: item.productVariantId,
              quantity: item.quantity,
              priceAtPurchaseCents: item.productVariant.priceCents,
            })),
          },
          statuses: {
            create: { status: 'pending' },
          },
        },
      });

      if (promoCode && discountAmountCents > 0) {
        await tx.promoCode.update({
          where: { code: promoCode },
          data: { usedCount: { increment: 1 } },
        });
      }
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      orderId,
    };
  }

  // ─── Payment Intent: Webhook Handler ────────────────────────────────────────────

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const orderId = paymentIntent.metadata?.orderId;

    if (!orderId) return;


    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.currentStatus === 'paid') return;

    const notificationBatch: LowStockNotificationJob[] = [];

    await this.prisma.$transaction(async (tx) => {
      const orderItems = await tx.orderItem.findMany({ where: { orderId } });

      for (const item of orderItems) {
        const variant = await tx.productVariant.findUniqueOrThrow({
          where: { id: item.variantId },
          select: {
            stock: true,
            product: { select: { name: true } },
            images: {
              take: 1,
              orderBy: { createdAt: 'asc' },
              select: { imageUrl: true },
            },
          },
        });

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });

        notificationBatch.push({
          variantId: item.variantId,
          oldStock: variant.stock,
          newStock: variant.stock - item.quantity,
          productName: variant.product.name,
          imageUrl: variant.images[0]?.imageUrl ?? null,
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: { currentStatus: 'paid' },
      });

      await tx.orderStatus.create({
        data: { orderId, status: 'paid' },
      });

      await tx.payment.create({
        data: {
          orderId,
          stripePaymentAttemptId: paymentIntent.id,
          amountCents: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: 'succeeded',
        },
      });

      const userId = paymentIntent.metadata?.userId;
      if (userId) {
        await tx.cartItem.deleteMany({ where: { userId } });
      }
    });

    await Promise.all(
      notificationBatch.map(
        ({ variantId, oldStock, newStock, productName, imageUrl }) =>
          this.stockNotificationService.checkAndDispatchLowStock(
            variantId,
            oldStock,
            newStock,
            productName,
            imageUrl,
          ),
      ),
    );
  }

  // ─── Payment Link Method ────────────────────────────────────────────

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {

    const existing = await this.prisma.order.findUnique({
      where: { stripeCheckoutSessionId: session.id },
    });
    if (existing) return;

    const fullSession = await this.stripeService.retrieveCheckoutSession(
      session.id,
    );

    const stripePriceId = fullSession.line_items?.data[0]?.price?.id;
    if (!stripePriceId) {
      throw new Error(
        `checkout.session.completed: no price ID in session ${session.id}`,
      );
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { stripePriceId },
    });
    if (!variant) {
      throw new Error(
        `checkout.session.completed: no variant found for price ${stripePriceId}`,
      );
    }

    const email = fullSession.customer_details?.email ?? null;
    const registeredUser = email
      ? await this.prisma.user.findUnique({ where: { email } })
      : null;

    const shippingDetails = fullSession.collected_information?.shipping_details;
    const address = shippingDetails?.address;
    if (!address) {
      throw new Error(
        `checkout.session.completed: no shipping address in session ${session.id}`,
      );
    }

    const paymentIntentId =
      typeof fullSession.payment_intent === 'string'
        ? fullSession.payment_intent
        : (fullSession.payment_intent?.id ?? null);

    let notificationData: LowStockNotificationJob | null = null;

    await this.prisma.$transaction(async (tx) => {

      const lockedVariant = await tx.productVariant.findUnique({
        where: { id: variant.id },
        select: {
          stock: true,
          product: { select: { name: true } },
          images: {
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: { imageUrl: true },
          },
        },
      });
      if (!lockedVariant || lockedVariant.stock <= 0) {
        throw new BadRequestException(
          `SKU "${variant.sku}" is out of stock. The order cannot be fulfilled.`,
        );
      }

      notificationData = {
        variantId: variant.id,
        oldStock: lockedVariant.stock,
        newStock: lockedVariant.stock - 1,
        productName: lockedVariant.product.name,
        imageUrl: lockedVariant.images[0]?.imageUrl ?? null,
      };

      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stock: { decrement: 1 } },
      });

      const savedAddress = await tx.shippingAddress.create({
        data: {
          userId: registeredUser?.id ?? null,
          recipientName: shippingDetails?.name ?? 'N/A',
          phoneNumber: fullSession.customer_details?.phone ?? 'N/A',
          street: address.line1!,
          city: address.city!,
          state: address.state!,
          country: address.country!,
          additionalDescription: address.line2 ?? null,
        },
      });

      await tx.order.create({
        data: {
          userId: registeredUser?.id ?? null,
          guestEmail: registeredUser ? null : email,

          shippingAddressId: savedAddress.id,
          stripeCheckoutSessionId: session.id,
          paymentMethodType: 'payment_link',
          currentStatus: 'paid',
          totalAmountCents: fullSession.amount_total!,
          discountAmountCents: 0,

          items: {
            create: {
              variantId: variant.id,
              quantity: 1,
              priceAtPurchaseCents: variant.priceCents,
            },
          },

          statuses: {
            create: { status: 'paid' },
          },

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

    if (notificationData) {
      const { variantId, oldStock, newStock, productName, imageUrl } =
        notificationData;
      await this.stockNotificationService.checkAndDispatchLowStock(
        variantId,
        oldStock,
        newStock,
        productName,
        imageUrl,
      );
    }
  }


}
