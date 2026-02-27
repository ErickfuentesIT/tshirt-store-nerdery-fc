jest.mock('../../common/prisma/prisma.service.js', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { CartService } from './cart.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = 'user-1';
const VARIANT_ID = 'variant-1';
const FIXED_DATE = new Date('2024-01-01T00:00:00.000Z');

const mockVariant = (overrides: Record<string, unknown> = {}) => ({
  id: VARIANT_ID,
  isActive: true,
  stock: 10,
  ...overrides,
});

const mockCartItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'cart-item-1',
  userId: USER_ID,
  productVariantId: VARIANT_ID,
  quantity: 2,
  createdAt: FIXED_DATE,
  ...overrides,
});

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('CartService', () => {
  let service: CartService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  // ── getCart ───────────────────────────────────────────────────────────────

  describe('getCart', () => {
    it('should return all cart items for a user ordered by createdAt', async () => {
      const items = [mockCartItem()];
      prismaMock.cartItem.findMany.mockResolvedValue(items as any);

      const result = await service.getCart(USER_ID);

      expect(prismaMock.cartItem.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(items);
    });
  });

  // ── addItemToCart ─────────────────────────────────────────────────────────

  describe('addItemToCart', () => {
    const input = { productVariantId: VARIANT_ID, quantity: 3 };

    it('should upsert the cart item when stock is sufficient and no existing item', async () => {
      prismaMock.productVariant.findUnique.mockResolvedValue(
        mockVariant() as any,
      );
      prismaMock.cartItem.findUnique.mockResolvedValue(null);
      prismaMock.cartItem.upsert.mockResolvedValue(
        mockCartItem({ quantity: 3 }) as any,
      );

      const result = await service.addItemToCart(USER_ID, input);

      expect(prismaMock.cartItem.upsert).toHaveBeenCalledWith({
        where: {
          userId_productVariantId: { userId: USER_ID, productVariantId: VARIANT_ID },
        },
        create: { userId: USER_ID, productVariantId: VARIANT_ID, quantity: 3 },
        update: { quantity: { increment: 3 } },
      });
      expect(result).toEqual(mockCartItem({ quantity: 3 }));
    });

    it('should upsert the cart item when combined quantity fits within stock', async () => {
      prismaMock.productVariant.findUnique.mockResolvedValue(
        mockVariant({ stock: 10 }) as any,
      );
      // 2 already in cart + 3 new = 5, within stock of 10
      prismaMock.cartItem.findUnique.mockResolvedValue(
        mockCartItem({ quantity: 2 }) as any,
      );
      prismaMock.cartItem.upsert.mockResolvedValue(
        mockCartItem({ quantity: 5 }) as any,
      );

      const result = await service.addItemToCart(USER_ID, input);

      expect(result).toEqual(mockCartItem({ quantity: 5 }));
    });

    it('should throw NotFoundException when variant does not exist', async () => {
      prismaMock.productVariant.findUnique.mockResolvedValue(null);

      await expect(service.addItemToCart(USER_ID, input)).rejects.toThrow(
        new NotFoundException(`Product variant "${VARIANT_ID}" not found.`),
      );
      expect(prismaMock.cartItem.upsert).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when variant is not active', async () => {
      prismaMock.productVariant.findUnique.mockResolvedValue(
        mockVariant({ isActive: false }) as any,
      );

      await expect(service.addItemToCart(USER_ID, input)).rejects.toThrow(
        new BadRequestException(
          `Product variant "${VARIANT_ID}" is not available.`,
        ),
      );
      expect(prismaMock.cartItem.upsert).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when prospective quantity exceeds stock', async () => {
      prismaMock.productVariant.findUnique.mockResolvedValue(
        mockVariant({ stock: 4 }) as any,
      );
      // 2 already in cart + 3 new = 5, exceeds stock of 4
      prismaMock.cartItem.findUnique.mockResolvedValue(
        mockCartItem({ quantity: 2 }) as any,
      );

      await expect(service.addItemToCart(USER_ID, input)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.cartItem.upsert).not.toHaveBeenCalled();
    });
  });

  // ── updateCartItemQuantity ────────────────────────────────────────────────

  describe('updateCartItemQuantity', () => {
    const input = { productVariantId: VARIANT_ID, quantity: 5 };

    it('should update the quantity when cart item exists and stock is sufficient', async () => {
      prismaMock.cartItem.findUnique.mockResolvedValue(
        mockCartItem() as any,
      );
      prismaMock.productVariant.findUnique.mockResolvedValue(
        mockVariant({ stock: 10 }) as any,
      );
      prismaMock.cartItem.update.mockResolvedValue(
        mockCartItem({ quantity: 5 }) as any,
      );

      const result = await service.updateCartItemQuantity(USER_ID, input);

      expect(prismaMock.cartItem.update).toHaveBeenCalledWith({
        where: {
          userId_productVariantId: { userId: USER_ID, productVariantId: VARIANT_ID },
        },
        data: { quantity: 5 },
      });
      expect(result).toEqual(mockCartItem({ quantity: 5 }));
    });

    it('should throw NotFoundException when cart item does not exist', async () => {
      prismaMock.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCartItemQuantity(USER_ID, input),
      ).rejects.toThrow(
        new NotFoundException(
          `Cart item for variant "${VARIANT_ID}" not found.`,
        ),
      );
      expect(prismaMock.cartItem.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when quantity exceeds available stock', async () => {
      prismaMock.cartItem.findUnique.mockResolvedValue(
        mockCartItem() as any,
      );
      prismaMock.productVariant.findUnique.mockResolvedValue(
        mockVariant({ stock: 3 }) as any,
      );

      await expect(
        service.updateCartItemQuantity(USER_ID, input),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.cartItem.update).not.toHaveBeenCalled();
    });
  });

  // ── clearCart ─────────────────────────────────────────────────────────────

  describe('clearCart', () => {
    it('should delete all cart items for the user and return the count', async () => {
      prismaMock.cartItem.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.clearCart(USER_ID);

      expect(prismaMock.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      });
      expect(result).toBe(3);
    });
  });

  // ── removeItemFromCart ────────────────────────────────────────────────────

  describe('removeItemFromCart', () => {
    it('should delete the cart item and return it when it exists', async () => {
      const item = mockCartItem();
      prismaMock.cartItem.findUnique.mockResolvedValue(item as any);
      prismaMock.cartItem.delete.mockResolvedValue(item as any);

      const result = await service.removeItemFromCart(USER_ID, VARIANT_ID);

      expect(prismaMock.cartItem.delete).toHaveBeenCalledWith({
        where: {
          userId_productVariantId: { userId: USER_ID, productVariantId: VARIANT_ID },
        },
      });
      expect(result).toEqual(item);
    });

    it('should throw NotFoundException when cart item does not exist', async () => {
      prismaMock.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.removeItemFromCart(USER_ID, VARIANT_ID),
      ).rejects.toThrow(
        new NotFoundException(
          `Cart item for variant "${VARIANT_ID}" not found.`,
        ),
      );
      expect(prismaMock.cartItem.delete).not.toHaveBeenCalled();
    });
  });
});
