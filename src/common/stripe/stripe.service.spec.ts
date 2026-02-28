jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    products: { create: jest.fn(), update: jest.fn() },
    prices: { create: jest.fn(), update: jest.fn() },
    paymentLinks: { create: jest.fn(), update: jest.fn() },
    customers: { create: jest.fn() },
    paymentIntents: { create: jest.fn() },
    checkout: { sessions: { retrieve: jest.fn() } },
    webhooks: { constructEvent: jest.fn() },
  })),
);

import { Test, TestingModule } from '@nestjs/testing';
import Stripe from 'stripe';

import { StripeService } from './stripe.service.js';
import { CustomConfigService } from '../config/config.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockConfigService = {
  stripe: {
    secretKey: 'sk_test_123',
    webhookSecret: 'whsec_abc',
  },
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('StripeService', () => {
  let service: StripeService;
  let stripeClient: any;

  beforeEach(async () => {
    (Stripe as unknown as jest.Mock).mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: CustomConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    stripeClient = service.client;

    // Reset all jest.fn() on the client
    for (const group of Object.values(stripeClient) as any[]) {
      if (group && typeof group === 'object') {
        for (const fn of Object.values(group) as any[]) {
          if (jest.isMockFunction(fn)) fn.mockReset();
          if (fn && typeof fn === 'object') {
            for (const nested of Object.values(fn) as any[]) {
              if (jest.isMockFunction(nested)) nested.mockReset();
            }
          }
        }
      }
    }
  });

  it('should initialise Stripe with the configured secret key', () => {
    expect(Stripe as unknown as jest.Mock).toHaveBeenCalledWith('sk_test_123');
  });

  it('should expose the webhookSecret from config', () => {
    expect(service.webhookSecret).toBe('whsec_abc');
  });

  // ── generateVariantStripeData ─────────────────────────────────────────────

  describe('generateVariantStripeData', () => {
    it('should create product, price, and payment link and return their IDs', async () => {
      stripeClient.products.create.mockResolvedValue({ id: 'prod_123' });
      stripeClient.prices.create.mockResolvedValue({ id: 'price_123' });
      stripeClient.paymentLinks.create.mockResolvedValue({
        id: 'plink_123',
        url: 'https://buy.stripe.com/test',
      });

      const result = await service.generateVariantStripeData(
        'Cool T-Shirt',
        1999,
        ['https://img.url/shirt.jpg'],
      );

      expect(stripeClient.products.create).toHaveBeenCalledWith({
        name: 'Cool T-Shirt',
        images: ['https://img.url/shirt.jpg'],
      });
      expect(stripeClient.prices.create).toHaveBeenCalledWith({
        product: 'prod_123',
        unit_amount: 1999,
        currency: 'usd',
      });
      expect(stripeClient.paymentLinks.create).toHaveBeenCalledWith({
        line_items: [{ price: 'price_123', quantity: 1 }],
        shipping_address_collection: { allowed_countries: ['US', 'MX', 'CA'] },
      });
      expect(result).toEqual({
        stripeProductId: 'prod_123',
        stripePriceId: 'price_123',
        stripePaymentLinkId: 'plink_123',
        stripePaymentLinkUrl: 'https://buy.stripe.com/test',
      });
    });
  });

  // ── retrieveCheckoutSession ───────────────────────────────────────────────

  describe('retrieveCheckoutSession', () => {
    it('should retrieve session with line_items expanded', async () => {
      const mockSession = { id: 'cs_123', amount_total: 1999 };
      stripeClient.checkout.sessions.retrieve.mockResolvedValue(mockSession);

      const result = await service.retrieveCheckoutSession('cs_123');

      expect(stripeClient.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_123', {
        expand: ['line_items', 'line_items.data.price'],
      });
      expect(result).toEqual(mockSession);
    });
  });

  // ── createCustomer ────────────────────────────────────────────────────────

  describe('createCustomer', () => {
    it('should create a Stripe customer with email and name', async () => {
      const mockCustomer = { id: 'cus_123', email: 'john@example.com' };
      stripeClient.customers.create.mockResolvedValue(mockCustomer);

      const result = await service.createCustomer('john@example.com', 'johndoe');

      expect(stripeClient.customers.create).toHaveBeenCalledWith({
        email: 'john@example.com',
        name: 'johndoe',
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should create a customer without a name when name is omitted', async () => {
      stripeClient.customers.create.mockResolvedValue({ id: 'cus_456' });

      await service.createCustomer('anon@example.com');

      expect(stripeClient.customers.create).toHaveBeenCalledWith({
        email: 'anon@example.com',
        name: undefined,
      });
    });
  });

  // ── createPaymentIntent ───────────────────────────────────────────────────

  describe('createPaymentIntent', () => {
    it('should create a payment intent with the correct params', async () => {
      const mockIntent = { id: 'pi_123', client_secret: 'secret_abc' };
      stripeClient.paymentIntents.create.mockResolvedValue(mockIntent);

      const result = await service.createPaymentIntent(
        2000,
        'usd',
        'cus_123',
        { orderId: 'order-1', userId: 'user-1' },
      );

      expect(stripeClient.paymentIntents.create).toHaveBeenCalledWith({
        amount: 2000,
        currency: 'usd',
        customer: 'cus_123',
        metadata: { orderId: 'order-1', userId: 'user-1' },
        automatic_payment_methods: { enabled: true },
      });
      expect(result).toEqual(mockIntent);
    });
  });

  // ── deactivateVariantStripeData ───────────────────────────────────────────

  describe('deactivateVariantStripeData', () => {
    it('should deactivate product, price, and payment link for each item', async () => {
      stripeClient.products.update.mockResolvedValue({});
      stripeClient.prices.update.mockResolvedValue({});
      stripeClient.paymentLinks.update.mockResolvedValue({});

      await service.deactivateVariantStripeData([
        {
          stripeProductId: 'prod_123',
          stripePriceId: 'price_123',
          stripePaymentLinkId: 'plink_123',
        },
      ]);

      expect(stripeClient.products.update).toHaveBeenCalledWith('prod_123', { active: false });
      expect(stripeClient.prices.update).toHaveBeenCalledWith('price_123', { active: false });
      expect(stripeClient.paymentLinks.update).toHaveBeenCalledWith('plink_123', { active: false });
    });

    it('should deactivate all items in parallel', async () => {
      stripeClient.products.update.mockResolvedValue({});
      stripeClient.prices.update.mockResolvedValue({});
      stripeClient.paymentLinks.update.mockResolvedValue({});

      await service.deactivateVariantStripeData([
        { stripeProductId: 'prod_1', stripePriceId: 'price_1', stripePaymentLinkId: 'plink_1' },
        { stripeProductId: 'prod_2', stripePriceId: 'price_2', stripePaymentLinkId: 'plink_2' },
      ]);

      expect(stripeClient.products.update).toHaveBeenCalledTimes(2);
      expect(stripeClient.prices.update).toHaveBeenCalledTimes(2);
      expect(stripeClient.paymentLinks.update).toHaveBeenCalledTimes(2);
    });
  });

  // ── verifyWebhookEvent ────────────────────────────────────────────────────

  describe('verifyWebhookEvent', () => {
    it('should call webhooks.constructEvent with raw body, signature, and webhook secret', () => {
      const mockEvent = { type: 'payment_intent.succeeded', data: { object: {} } };
      stripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);

      const rawBody = Buffer.from('raw-body');
      const result = service.verifyWebhookEvent(rawBody, 'stripe-sig');

      expect(stripeClient.webhooks.constructEvent).toHaveBeenCalledWith(
        rawBody,
        'stripe-sig',
        'whsec_abc',
      );
      expect(result).toEqual(mockEvent);
    });
  });
});
