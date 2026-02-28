jest.mock('../../../common/prisma/prisma.service.js', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('../helpers/validate-stock.helper.js', () => ({
  validateStock: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { randomUUID } from 'crypto';

import { OrdersService } from './orders.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { StripeService } from '../../../common/stripe/stripe.service.js';
import { StockNotificationService } from './stock-notification.service.js';
import { PromoCodesService } from '../../promo-codes/promo-codes.service.js';
import { validateStock } from '../helpers/validate-stock.helper.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ORDER_ID = 'order-uuid-1';
const USER_ID = 'user-1';
const DELIVERY_ID = 'delivery-1';
const FIXED_DATE = new Date('2024-01-01T00:00:00.000Z');

const mockOrder = (overrides: Record<string, unknown> = {}) => ({
  id: ORDER_ID,
  userId: USER_ID,
  currentStatus: 'pending',
  totalAmountCents: 2500,
  discountAmountCents: 0,
  assignedDeliveryId: null,
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
  ...overrides,
});

const mockCartItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'cart-item-1',
  userId: USER_ID,
  productVariantId: 'variant-1',
  quantity: 2,
  productVariant: {
    id: 'variant-1',
    productId: 'prod-1',
    priceCents: 1000,
    stock: 10,
    sku: 'SKU-001',
  },
  ...overrides,
});

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaMock: DeepMockProxy<PrismaService>;
  let stripeServiceMock: DeepMockProxy<StripeService>;
  let stockNotificationMock: DeepMockProxy<StockNotificationService>;
  let promoCodesMock: DeepMockProxy<PromoCodesService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();
    stripeServiceMock = mockDeep<StripeService>();
    stockNotificationMock = mockDeep<StockNotificationService>();
    promoCodesMock = mockDeep<PromoCodesService>();

    // Default: transaction immediately executes the callback with prismaMock as tx
    prismaMock.$transaction.mockImplementation((arg: any) =>
      typeof arg === 'function' ? arg(prismaMock) : Promise.all(arg),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StripeService, useValue: stripeServiceMock },
        { provide: StockNotificationService, useValue: stockNotificationMock },
        { provide: PromoCodesService, useValue: promoCodesMock },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all orders ordered by createdAt desc', async () => {
      const orders = [mockOrder()];
      prismaMock.order.findMany.mockResolvedValue(orders as any);

      const result = await service.findAll();

      expect(prismaMock.order.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(orders);
    });
  });

  // ── findAllForUser ────────────────────────────────────────────────────────

  describe('findAllForUser', () => {
    it('should query with default pagination when no filters are provided', async () => {
      prismaMock.order.findMany.mockResolvedValue([]);

      await service.findAllForUser(USER_ID);

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID },
          take: 10,
          skip: 0,
        }),
      );
    });

    it('should apply status and date filters when provided', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');
      prismaMock.order.findMany.mockResolvedValue([]);

      await service.findAllForUser(USER_ID, {
        status: 'paid' as any,
        fromDate,
        toDate,
        limit: 5,
        offset: 2,
      });

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            currentStatus: 'paid',
            createdAt: { gte: fromDate, lte: toDate },
          }),
          take: 5,
          skip: 2,
        }),
      );
    });

    it('should apply amount range filters when provided', async () => {
      prismaMock.order.findMany.mockResolvedValue([]);

      await service.findAllForUser(USER_ID, {
        minAmountCents: 500,
        maxAmountCents: 5000,
      });

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            totalAmountCents: { gte: 500, lte: 5000 },
          }),
        }),
      );
    });
  });

  // ── assignDeliveryAndMarkProcessing ───────────────────────────────────────

  describe('assignDeliveryAndMarkProcessing', () => {
    const input = {
      assignedDeliveryId: DELIVERY_ID,
      orderIds: ['order-1', 'order-2'],
    };

    it('should update all orders to processing and return the count', async () => {
      const orders = [
        { id: 'order-1', currentStatus: 'paid' },
        { id: 'order-2', currentStatus: 'paid' },
      ];
      prismaMock.order.findMany.mockResolvedValue(orders as any);
      prismaMock.order.updateMany.mockResolvedValue({ count: 2 });
      prismaMock.orderStatus.createMany.mockResolvedValue({ count: 2 });

      const result = await service.assignDeliveryAndMarkProcessing(
        input,
        'manager-1',
      );

      expect(result).toBe(2);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when some order IDs are not found', async () => {
      prismaMock.order.findMany.mockResolvedValue([
        { id: 'order-1', currentStatus: 'paid' },
      ] as any);

      await expect(
        service.assignDeliveryAndMarkProcessing(input, 'manager-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when any order is not in paid status', async () => {
      prismaMock.order.findMany.mockResolvedValue([
        { id: 'order-1', currentStatus: 'paid' },
        { id: 'order-2', currentStatus: 'pending' },
      ] as any);

      await expect(
        service.assignDeliveryAndMarkProcessing(input, 'manager-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── markOrderAsShipped ────────────────────────────────────────────────────

  describe('markOrderAsShipped', () => {
    it('should mark a processing order as shipped', async () => {
      const order = { id: ORDER_ID, currentStatus: 'processing' };
      const updated = mockOrder({ currentStatus: 'shipped' });
      prismaMock.order.findUnique.mockResolvedValue(order as any);
      prismaMock.order.update.mockResolvedValue(updated as any);
      prismaMock.orderStatus.create.mockResolvedValue({} as any);

      const result = await service.markOrderAsShipped(ORDER_ID, 'manager-1');

      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { currentStatus: 'shipped' } }),
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(
        service.markOrderAsShipped(ORDER_ID, 'manager-1'),
      ).rejects.toThrow(new NotFoundException(`Order "${ORDER_ID}" not found.`));
    });

    it.each(['pending', 'paid', 'shipped', 'delivered', 'cancelled'])(
      'should throw BadRequestException when order status is "%s"',
      async (status) => {
        prismaMock.order.findUnique.mockResolvedValue(
          { id: ORDER_ID, currentStatus: status } as any,
        );

        await expect(
          service.markOrderAsShipped(ORDER_ID, 'manager-1'),
        ).rejects.toThrow(BadRequestException);
      },
    );
  });

  // ── getMyAssignedDeliveries ───────────────────────────────────────────────

  describe('getMyAssignedDeliveries', () => {
    it('should return shipped orders assigned to the delivery person', async () => {
      const orders = [mockOrder({ currentStatus: 'shipped', assignedDeliveryId: DELIVERY_ID })];
      prismaMock.order.findMany.mockResolvedValue(orders as any);

      const result = await service.getMyAssignedDeliveries(DELIVERY_ID);

      expect(prismaMock.order.findMany).toHaveBeenCalledWith({
        where: { assignedDeliveryId: DELIVERY_ID, currentStatus: 'shipped' },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual(orders);
    });
  });

  // ── markOrderAsDelivered ──────────────────────────────────────────────────

  describe('markOrderAsDelivered', () => {
    it('should mark a shipped order as delivered', async () => {
      const order = {
        id: ORDER_ID,
        currentStatus: 'shipped',
        assignedDeliveryId: DELIVERY_ID,
      };
      const updated = mockOrder({ currentStatus: 'delivered' });
      prismaMock.order.findUnique.mockResolvedValue(order as any);
      prismaMock.order.update.mockResolvedValue(updated as any);
      prismaMock.orderStatus.create.mockResolvedValue({} as any);

      const result = await service.markOrderAsDelivered(ORDER_ID, DELIVERY_ID);

      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { currentStatus: 'delivered' } }),
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(
        service.markOrderAsDelivered(ORDER_ID, DELIVERY_ID),
      ).rejects.toThrow(new NotFoundException(`Order "${ORDER_ID}" not found.`));
    });

    it('should throw UnauthorizedException when caller is not the assigned delivery person', async () => {
      prismaMock.order.findUnique.mockResolvedValue(
        { id: ORDER_ID, currentStatus: 'shipped', assignedDeliveryId: 'other-delivery' } as any,
      );

      await expect(
        service.markOrderAsDelivered(ORDER_ID, DELIVERY_ID),
      ).rejects.toThrow(UnauthorizedException);
    });

    it.each(['pending', 'paid', 'processing', 'delivered', 'cancelled'])(
      'should throw BadRequestException when order status is "%s"',
      async (status) => {
        prismaMock.order.findUnique.mockResolvedValue(
          { id: ORDER_ID, currentStatus: status, assignedDeliveryId: DELIVERY_ID } as any,
        );

        await expect(
          service.markOrderAsDelivered(ORDER_ID, DELIVERY_ID),
        ).rejects.toThrow(BadRequestException);
      },
    );
  });

  // ── cancelOrder ───────────────────────────────────────────────────────────

  describe('cancelOrder', () => {
    it('should cancel a pending order', async () => {
      const order = { id: ORDER_ID, userId: USER_ID, currentStatus: 'pending' };
      const updated = mockOrder({ currentStatus: 'cancelled' });
      prismaMock.order.findUnique.mockResolvedValue(order as any);
      prismaMock.order.update.mockResolvedValue(updated as any);
      prismaMock.orderStatus.create.mockResolvedValue({} as any);

      const result = await service.cancelOrder(ORDER_ID, USER_ID);

      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { currentStatus: 'cancelled' } }),
      );
      expect(result).toEqual(updated);
    });

    it('should cancel a paid order', async () => {
      const order = { id: ORDER_ID, userId: USER_ID, currentStatus: 'paid' };
      prismaMock.order.findUnique.mockResolvedValue(order as any);
      prismaMock.order.update.mockResolvedValue(
        mockOrder({ currentStatus: 'cancelled' }) as any,
      );
      prismaMock.orderStatus.create.mockResolvedValue({} as any);

      await service.cancelOrder(ORDER_ID, USER_ID);

      expect(prismaMock.order.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order does not exist', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(service.cancelOrder(ORDER_ID, USER_ID)).rejects.toThrow(
        new NotFoundException(`Order "${ORDER_ID}" not found.`),
      );
    });

    it('should throw ForbiddenException when order belongs to another user', async () => {
      prismaMock.order.findUnique.mockResolvedValue(
        { id: ORDER_ID, userId: 'other-user', currentStatus: 'pending' } as any,
      );

      await expect(service.cancelOrder(ORDER_ID, USER_ID)).rejects.toThrow(
        new ForbiddenException('You do not have permission to cancel this order.'),
      );
    });

    it.each(['shipped', 'delivered', 'cancelled'])(
      'should throw BadRequestException when order status is "%s"',
      async (status) => {
        prismaMock.order.findUnique.mockResolvedValue(
          { id: ORDER_ID, userId: USER_ID, currentStatus: status } as any,
        );

        await expect(service.cancelOrder(ORDER_ID, USER_ID)).rejects.toThrow(
          BadRequestException,
        );
      },
    );
  });

  // ── initiateCartCheckout ──────────────────────────────────────────────────

  describe('initiateCartCheckout', () => {
    const mockUser = {
      id: USER_ID,
      email: 'john@example.com',
      username: 'johndoe',
      stripeCustomerId: 'cus_existing',
    };
    const cartItem = mockCartItem();

    beforeEach(() => {
      (randomUUID as jest.Mock).mockReturnValue(ORDER_ID);
      prismaMock.user.findUniqueOrThrow.mockResolvedValue(mockUser as any);
      prismaMock.cartItem.findMany.mockResolvedValue([cartItem] as any);
      stripeServiceMock.createPaymentIntent.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'secret_abc',
      } as any);
      prismaMock.order.create.mockResolvedValue(mockOrder() as any);
    });

    it('should create an order and return clientSecret and orderId', async () => {
      const result = await service.initiateCartCheckout(
        USER_ID,
        'address-1',
      );

      expect(stripeServiceMock.createPaymentIntent).toHaveBeenCalledWith(
        2000, // 2 × 1000 priceCents
        'usd',
        mockUser.stripeCustomerId,
        { orderId: ORDER_ID, userId: USER_ID },
      );
      expect(result).toEqual({
        clientSecret: 'secret_abc',
        orderId: ORDER_ID,
      });
    });

    it('should create a Stripe customer when user has no stripeCustomerId', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue(
        { ...mockUser, stripeCustomerId: null } as any,
      );
      stripeServiceMock.createCustomer.mockResolvedValue({ id: 'cus_new' } as any);
      prismaMock.user.update.mockResolvedValue({} as any);

      await service.initiateCartCheckout(USER_ID, 'address-1');

      expect(stripeServiceMock.createCustomer).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.username,
      );
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { stripeCustomerId: 'cus_new' },
      });
    });

    it('should apply promo discount when a valid promo code is provided', async () => {
      promoCodesMock.validateAndCalculateDiscount.mockResolvedValue({
        isValid: true,
        totalDiscountCents: 200,
      });

      await service.initiateCartCheckout(USER_ID, 'address-1', 'SAVE10');

      expect(promoCodesMock.validateAndCalculateDiscount).toHaveBeenCalledWith(
        'SAVE10',
        expect.any(Array),
      );
      // charge = 2000 - 200 = 1800
      expect(stripeServiceMock.createPaymentIntent).toHaveBeenCalledWith(
        1800,
        'usd',
        mockUser.stripeCustomerId,
        expect.any(Object),
      );
    });

    it('should throw BadRequestException when cart is empty', async () => {
      prismaMock.cartItem.findMany.mockResolvedValue([]);

      await expect(
        service.initiateCartCheckout(USER_ID, 'address-1'),
      ).rejects.toThrow(new BadRequestException('Your cart is empty.'));
    });

    it('should throw BadRequestException when stock validation fails', async () => {
      (validateStock as jest.Mock).mockImplementationOnce(() => {
        throw new BadRequestException('Insufficient stock for SKU "SKU-001".');
      });

      await expect(
        service.initiateCartCheckout(USER_ID, 'address-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── handleStripeEvent ─────────────────────────────────────────────────────

  describe('handleStripeEvent', () => {
    it('should handle payment_intent.succeeded and mark order as paid', async () => {
      const paymentIntent = {
        id: 'pi_123',
        amount: 2000,
        currency: 'usd',
        metadata: { orderId: ORDER_ID, userId: USER_ID },
      };
      prismaMock.order.findUnique.mockResolvedValue(
        mockOrder({ currentStatus: 'pending' }) as any,
      );
      prismaMock.orderItem.findMany.mockResolvedValue([
        { variantId: 'variant-1', quantity: 2 },
      ] as any);
      prismaMock.productVariant.findUniqueOrThrow.mockResolvedValue({
        stock: 10,
        product: { name: 'Test Product' },
        images: [{ imageUrl: 'http://img.url' }],
      } as any);
      prismaMock.productVariant.update.mockResolvedValue({} as any);
      prismaMock.order.update.mockResolvedValue(
        mockOrder({ currentStatus: 'paid' }) as any,
      );
      prismaMock.orderStatus.create.mockResolvedValue({} as any);
      prismaMock.payment.create.mockResolvedValue({} as any);
      prismaMock.cartItem.deleteMany.mockResolvedValue({ count: 1 });
      stockNotificationMock.checkAndDispatchLowStock.mockResolvedValue(
        undefined,
      );

      await service.handleStripeEvent({
        type: 'payment_intent.succeeded',
        data: { object: paymentIntent },
      } as any);

      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { currentStatus: 'paid' } }),
      );
      expect(prismaMock.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      });
    });

    it('should skip processing for payment_intent.succeeded if order is already paid', async () => {
      const paymentIntent = {
        id: 'pi_123',
        amount: 2000,
        currency: 'usd',
        metadata: { orderId: ORDER_ID, userId: USER_ID },
      };
      prismaMock.order.findUnique.mockResolvedValue(
        mockOrder({ currentStatus: 'paid' }) as any,
      );

      await service.handleStripeEvent({
        type: 'payment_intent.succeeded',
        data: { object: paymentIntent },
      } as any);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should do nothing for unhandled event types', async () => {
      await service.handleStripeEvent({
        type: 'customer.created',
        data: { object: {} },
      } as any);

      expect(prismaMock.order.findUnique).not.toHaveBeenCalled();
    });

    // ── payment_intent.succeeded – missing branches ──────────────────────────

    it('should skip processing for payment_intent.succeeded when orderId is missing from metadata', async () => {
      await service.handleStripeEvent({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123', metadata: {} } },
      } as any);

      expect(prismaMock.order.findUnique).not.toHaveBeenCalled();
    });

    it('should skip processing for payment_intent.succeeded when order is not found in DB', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await service.handleStripeEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_123', metadata: { orderId: ORDER_ID, userId: USER_ID } },
        },
      } as any);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should not call cartItem.deleteMany when userId is missing from payment_intent metadata', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder({ currentStatus: 'pending' }) as any);
      prismaMock.orderItem.findMany.mockResolvedValue([{ variantId: 'variant-1', quantity: 1 }] as any);
      prismaMock.productVariant.findUniqueOrThrow.mockResolvedValue({
        stock: 10,
        product: { name: 'Test Product' },
        images: [],
      } as any);
      prismaMock.productVariant.update.mockResolvedValue({} as any);
      prismaMock.order.update.mockResolvedValue(mockOrder({ currentStatus: 'paid' }) as any);
      prismaMock.orderStatus.create.mockResolvedValue({} as any);
      prismaMock.payment.create.mockResolvedValue({} as any);
      stockNotificationMock.checkAndDispatchLowStock.mockResolvedValue(undefined);

      await service.handleStripeEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            amount: 2000,
            currency: 'usd',
            metadata: { orderId: ORDER_ID }, // no userId
          },
        },
      } as any);

      expect(prismaMock.cartItem.deleteMany).not.toHaveBeenCalled();
    });

    it('should handle variant with no images in payment_intent.succeeded', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder({ currentStatus: 'pending' }) as any);
      prismaMock.orderItem.findMany.mockResolvedValue([{ variantId: 'variant-1', quantity: 1 }] as any);
      prismaMock.productVariant.findUniqueOrThrow.mockResolvedValue({
        stock: 10,
        product: { name: 'Test Product' },
        images: [], // empty — triggers imageUrl ?? null branch
      } as any);
      prismaMock.productVariant.update.mockResolvedValue({} as any);
      prismaMock.order.update.mockResolvedValue(mockOrder({ currentStatus: 'paid' }) as any);
      prismaMock.orderStatus.create.mockResolvedValue({} as any);
      prismaMock.payment.create.mockResolvedValue({} as any);
      prismaMock.cartItem.deleteMany.mockResolvedValue({ count: 0 });
      stockNotificationMock.checkAndDispatchLowStock.mockResolvedValue(undefined);

      await service.handleStripeEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_123', amount: 2000, currency: 'usd', metadata: { orderId: ORDER_ID, userId: USER_ID } },
        },
      } as any);

      expect(stockNotificationMock.checkAndDispatchLowStock).toHaveBeenCalledWith(
        'variant-1', 10, 9, 'Test Product', null,
      );
    });

    // ── checkout.session.completed ───────────────────────────────────────────

    describe('checkout.session.completed', () => {
      const SESSION_ID = 'cs_test_123';
      const STRIPE_PRICE_ID = 'price_stripe_123';

      const mockFullSession = {
        id: SESSION_ID,
        amount_total: 1999,
        currency: 'usd',
        line_items: { data: [{ price: { id: STRIPE_PRICE_ID } }] },
        customer_details: { email: 'user@example.com', phone: '+1234567890' },
        collected_information: {
          shipping_details: {
            name: 'John Doe',
            address: { line1: '123 Main St', city: 'Austin', state: 'TX', country: 'US', line2: null },
          },
        },
        payment_intent: 'pi_stripe_123',
      };

      const mockVariantStripe = {
        id: 'variant-stripe-1',
        sku: 'cool-shirt-red-xl',
        priceCents: 1999,
        stripePriceId: STRIPE_PRICE_ID,
      };

      const mockLockedVariant = {
        stock: 5,
        product: { name: 'Cool T-Shirt' },
        images: [{ imageUrl: 'https://img.url/shirt.jpg' }],
      };

      const mockSavedAddress = { id: 'addr-new-1' };
      const mockRegisteredUser = { id: USER_ID, email: 'user@example.com' };

      const dispatchEvent = (sessionOverrides: object = {}) =>
        service.handleStripeEvent({
          type: 'checkout.session.completed',
          data: { object: { id: SESSION_ID, ...sessionOverrides } },
        } as any);

      beforeEach(() => {
        prismaMock.order.findUnique.mockResolvedValue(null); // no existing order
        stripeServiceMock.retrieveCheckoutSession.mockResolvedValue(mockFullSession as any);
        prismaMock.productVariant.findUnique
          .mockResolvedValueOnce(mockVariantStripe as any)   // by stripePriceId
          .mockResolvedValueOnce(mockLockedVariant as any);  // locked inside tx
        prismaMock.user.findUnique.mockResolvedValue(mockRegisteredUser as any);
        prismaMock.shippingAddress.create.mockResolvedValue(mockSavedAddress as any);
        prismaMock.productVariant.update.mockResolvedValue({} as any);
        prismaMock.order.create.mockResolvedValue(mockOrder() as any);
        stockNotificationMock.checkAndDispatchLowStock.mockResolvedValue(undefined);
      });

      it('should create an order for a registered user (payment_intent as string)', async () => {
        await dispatchEvent();

        expect(stripeServiceMock.retrieveCheckoutSession).toHaveBeenCalledWith(SESSION_ID);
        expect(prismaMock.shippingAddress.create).toHaveBeenCalled();
        expect(prismaMock.order.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userId: USER_ID,
              guestEmail: null,
              paymentMethodType: 'payment_link',
              currentStatus: 'paid',
              stripeCheckoutSessionId: SESSION_ID,
            }),
          }),
        );
        expect(stockNotificationMock.checkAndDispatchLowStock).toHaveBeenCalledWith(
          mockVariantStripe.id, 5, 4, 'Cool T-Shirt', 'https://img.url/shirt.jpg',
        );
      });

      it('should return early when the order already exists', async () => {
        prismaMock.order.findUnique.mockResolvedValue(mockOrder() as any);

        await dispatchEvent();

        expect(stripeServiceMock.retrieveCheckoutSession).not.toHaveBeenCalled();
        expect(prismaMock.order.create).not.toHaveBeenCalled();
      });

      it('should create an order with guestEmail when user is not registered', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null); // guest
        prismaMock.productVariant.findUnique
          .mockReset()
          .mockResolvedValueOnce(mockVariantStripe as any)
          .mockResolvedValueOnce(mockLockedVariant as any);

        await dispatchEvent();

        expect(prismaMock.order.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userId: null,
              guestEmail: 'user@example.com',
            }),
          }),
        );
      });

      it('should handle payment_intent as an object (not a string)', async () => {
        stripeServiceMock.retrieveCheckoutSession.mockResolvedValue({
          ...mockFullSession,
          payment_intent: { id: 'pi_obj_123' },
        } as any);
        prismaMock.productVariant.findUnique
          .mockReset()
          .mockResolvedValueOnce(mockVariantStripe as any)
          .mockResolvedValueOnce(mockLockedVariant as any);

        await dispatchEvent();

        expect(prismaMock.order.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              payments: expect.objectContaining({
                create: expect.objectContaining({ stripePaymentAttemptId: 'pi_obj_123' }),
              }),
            }),
          }),
        );
      });

      it('should throw Error when no line-item price ID is found in the session', async () => {
        stripeServiceMock.retrieveCheckoutSession.mockResolvedValue({
          ...mockFullSession,
          line_items: { data: [] },
        } as any);

        await expect(dispatchEvent()).rejects.toThrow(
          `checkout.session.completed: no price ID in session ${SESSION_ID}`,
        );
      });

      it('should throw Error when no variant matches the session price ID', async () => {
        prismaMock.productVariant.findUnique.mockReset().mockResolvedValue(null);

        await expect(dispatchEvent()).rejects.toThrow(
          `checkout.session.completed: no variant found for price ${STRIPE_PRICE_ID}`,
        );
      });

      it('should throw Error when the session has no shipping address', async () => {
        stripeServiceMock.retrieveCheckoutSession.mockResolvedValue({
          ...mockFullSession,
          collected_information: { shipping_details: null },
        } as any);
        prismaMock.productVariant.findUnique
          .mockReset()
          .mockResolvedValueOnce(mockVariantStripe as any);

        await expect(dispatchEvent()).rejects.toThrow(
          `checkout.session.completed: no shipping address in session ${SESSION_ID}`,
        );
      });

      it('should throw BadRequestException when the variant is out of stock', async () => {
        prismaMock.productVariant.findUnique
          .mockReset()
          .mockResolvedValueOnce(mockVariantStripe as any)
          .mockResolvedValueOnce({ ...mockLockedVariant, stock: 0 } as any); // out of stock

        await expect(dispatchEvent()).rejects.toThrow(
          `SKU "${mockVariantStripe.sku}" is out of stock. The order cannot be fulfilled.`,
        );
      });

      it('should not call checkAndDispatchLowStock when notificationData is null', async () => {
        // notificationData stays null when the tx throws before setting it
        prismaMock.productVariant.findUnique
          .mockReset()
          .mockResolvedValueOnce(mockVariantStripe as any)
          .mockResolvedValueOnce({ ...mockLockedVariant, stock: 0 } as any);

        await expect(dispatchEvent()).rejects.toThrow();
        expect(stockNotificationMock.checkAndDispatchLowStock).not.toHaveBeenCalled();
      });
    });
  });
});
