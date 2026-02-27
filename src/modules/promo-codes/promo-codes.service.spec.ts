jest.mock('../../common/prisma/prisma.service.js', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { PromoCodesService } from './promo-codes.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { CartItemForDiscount } from './types/cart-item.type.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FUTURE_DATE = new Date('2099-01-01T00:00:00.000Z');
const PAST_DATE = new Date('2000-01-01T00:00:00.000Z');

const mockPromo = (overrides: Record<string, unknown> = {}) => ({
  id: 'promo-1',
  code: 'SAVE10',
  isActive: true,
  expirationDate: FUTURE_DATE,
  usageLimit: null,
  usedCount: 0,
  minPurchaseAmountCents: null,
  discountType: 'PERCENTAGE',
  discountValue: 10,
  applications: [],
  campaignId: null,
  ...overrides,
});

const cartItems: CartItemForDiscount[] = [
  { productId: 'prod-1', variantId: 'var-1', priceCents: 1000, quantity: 2 },
  { productId: 'prod-2', variantId: 'var-2', priceCents: 500, quantity: 1 },
];
// cart total = 2500 cents

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('PromoCodesService', () => {
  let service: PromoCodesService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromoCodesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<PromoCodesService>(PromoCodesService);
  });

  // ── createPromoCode ───────────────────────────────────────────────────────

  describe('createPromoCode', () => {
    it('should create a promo code with applications and return it', async () => {
      const input = {
        code: 'SAVE10',
        discountType: 'PERCENTAGE' as const,
        discountValue: 10,
        expirationDate: FUTURE_DATE,
        isActive: true,
        usageLimit: null,
        minPurchaseAmountCents: null,
        campaignId: null,
        applications: [{ productId: 'prod-1', productVariantId: null }],
      };
      const created = mockPromo({ applications: [{ productId: 'prod-1' }] });
      prismaMock.promoCode.create.mockResolvedValue(created as any);

      const result = await service.createPromoCode(input as any);

      expect(prismaMock.promoCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'SAVE10',
          applications: {
            create: [{ productId: 'prod-1', productVariantId: null }],
          },
        }),
        include: { applications: true },
      });
      expect(result).toEqual(created);
    });

    it('should connect a campaign when campaignId is provided', async () => {
      const input = {
        code: 'SUMMER',
        discountType: 'PERCENTAGE' as const,
        discountValue: 15,
        expirationDate: FUTURE_DATE,
        isActive: true,
        usageLimit: null,
        minPurchaseAmountCents: null,
        campaignId: 'campaign-1',
        applications: [],
      };
      prismaMock.promoCode.create.mockResolvedValue(mockPromo() as any);

      await service.createPromoCode(input as any);

      expect(prismaMock.promoCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          campaign: { connect: { id: 'campaign-1' } },
        }),
        include: { applications: true },
      });
    });
  });

  // ── togglePromoCode ───────────────────────────────────────────────────────

  describe('togglePromoCode', () => {
    it('should deactivate an active promo code', async () => {
      const active = { id: 'promo-1', isActive: true };
      const toggled = mockPromo({ isActive: false });
      prismaMock.promoCode.findUnique.mockResolvedValue(active as any);
      prismaMock.promoCode.update.mockResolvedValue(toggled as any);

      const result = await service.togglePromoCode('promo-1');

      expect(prismaMock.promoCode.update).toHaveBeenCalledWith({
        where: { id: 'promo-1' },
        data: { isActive: false },
        include: { applications: true },
      });
      expect(result).toEqual(toggled);
    });

    it('should activate an inactive promo code', async () => {
      const inactive = { id: 'promo-1', isActive: false };
      const toggled = mockPromo({ isActive: true });
      prismaMock.promoCode.findUnique.mockResolvedValue(inactive as any);
      prismaMock.promoCode.update.mockResolvedValue(toggled as any);

      await service.togglePromoCode('promo-1');

      expect(prismaMock.promoCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: true } }),
      );
    });

    it('should throw NotFoundException when promo code does not exist', async () => {
      prismaMock.promoCode.findUnique.mockResolvedValue(null);

      await expect(service.togglePromoCode('non-existent')).rejects.toThrow(
        new NotFoundException(`Promo code "non-existent" not found.`),
      );
      expect(prismaMock.promoCode.update).not.toHaveBeenCalled();
    });
  });

  // ── validateAndCalculateDiscount ──────────────────────────────────────────

  describe('validateAndCalculateDiscount', () => {
    it('should return the correct percentage discount for a store-wide promo', async () => {
      // 10% of 2500 = 250 cents
      prismaMock.promoCode.findUnique.mockResolvedValue(
        mockPromo({ discountType: 'PERCENTAGE', discountValue: 10 }) as any,
      );

      const result = await service.validateAndCalculateDiscount(
        'SAVE10',
        cartItems,
      );

      expect(result).toEqual({ isValid: true, totalDiscountCents: 250 });
    });

    it('should return the correct flat discount for a store-wide promo', async () => {
      // flat 300 cents off 2500 total
      prismaMock.promoCode.findUnique.mockResolvedValue(
        mockPromo({ discountType: 'FLAT', discountValue: 300 }) as any,
      );

      const result = await service.validateAndCalculateDiscount(
        'SAVE10',
        cartItems,
      );

      expect(result).toEqual({ isValid: true, totalDiscountCents: 300 });
    });

    it('should cap the discount at the eligible subtotal', async () => {
      // flat 9999 cents off, but eligible subtotal is only 2500
      prismaMock.promoCode.findUnique.mockResolvedValue(
        mockPromo({ discountType: 'FLAT', discountValue: 9999 }) as any,
      );

      const result = await service.validateAndCalculateDiscount(
        'SAVE10',
        cartItems,
      );

      expect(result).toEqual({ isValid: true, totalDiscountCents: 2500 });
    });

    it('should apply discount only to eligible products when applications are set', async () => {
      // Only prod-1 (2 × 1000 = 2000 cents) is eligible — 10% = 200 cents
      prismaMock.promoCode.findUnique.mockResolvedValue(
        mockPromo({
          discountType: 'PERCENTAGE',
          discountValue: 10,
          applications: [{ productId: 'prod-1', productVariantId: null }],
        }) as any,
      );

      const result = await service.validateAndCalculateDiscount(
        'SAVE10',
        cartItems,
      );

      expect(result).toEqual({ isValid: true, totalDiscountCents: 200 });
    });

    it('should apply discount only to the matching variant when productVariantId is set', async () => {
      // Only var-1 of prod-1 (2 × 1000 = 2000 cents) — 10% = 200 cents
      prismaMock.promoCode.findUnique.mockResolvedValue(
        mockPromo({
          discountType: 'PERCENTAGE',
          discountValue: 10,
          applications: [{ productId: 'prod-1', productVariantId: 'var-1' }],
        }) as any,
      );

      const result = await service.validateAndCalculateDiscount(
        'SAVE10',
        cartItems,
      );

      expect(result).toEqual({ isValid: true, totalDiscountCents: 200 });
    });

    it('should throw BadRequestException when promo code does not exist', async () => {
      prismaMock.promoCode.findUnique.mockResolvedValue(null);

      await expect(
        service.validateAndCalculateDiscount('INVALID', cartItems),
      ).rejects.toThrow(
        new BadRequestException(`Promo code "INVALID" is not valid.`),
      );
    });

    it('should throw BadRequestException when promo code is inactive', async () => {
      prismaMock.promoCode.findUnique.mockResolvedValue(
        mockPromo({ isActive: false }) as any,
      );

      await expect(
        service.validateAndCalculateDiscount('SAVE10', cartItems),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when promo code has expired', async () => {
      prismaMock.promoCode.findUnique.mockResolvedValue(
        mockPromo({ expirationDate: PAST_DATE }) as any,
      );

      await expect(
        service.validateAndCalculateDiscount('SAVE10', cartItems),
      ).rejects.toThrow(
        new BadRequestException(`Promo code "SAVE10" has expired.`),
      );
    });

    it('should throw BadRequestException when usage limit is reached', async () => {
      prismaMock.promoCode.findUnique.mockResolvedValue(
        mockPromo({ usageLimit: 5, usedCount: 5 }) as any,
      );

      await expect(
        service.validateAndCalculateDiscount('SAVE10', cartItems),
      ).rejects.toThrow(
        new BadRequestException(
          `Promo code "SAVE10" has reached its maximum number of uses.`,
        ),
      );
    });

    it('should throw BadRequestException when cart total is below the minimum purchase amount', async () => {
      // cart total = 2500 cents, minimum = 5000
      prismaMock.promoCode.findUnique.mockResolvedValue(
        mockPromo({ minPurchaseAmountCents: 5000 }) as any,
      );

      await expect(
        service.validateAndCalculateDiscount('SAVE10', cartItems),
      ).rejects.toThrow(
        new BadRequestException(
          `Promo code "SAVE10" requires a minimum purchase of $50.00.`,
        ),
      );
    });

    it('should throw BadRequestException when no cart items match the promo applications', async () => {
      prismaMock.promoCode.findUnique.mockResolvedValue(
        mockPromo({
          applications: [{ productId: 'prod-99', productVariantId: null }],
        }) as any,
      );

      await expect(
        service.validateAndCalculateDiscount('SAVE10', cartItems),
      ).rejects.toThrow(
        new BadRequestException(
          `Promo code "SAVE10" does not apply to any items in your cart.`,
        ),
      );
    });
  });
});
