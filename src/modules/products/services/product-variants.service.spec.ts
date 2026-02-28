jest.mock('../../../common/prisma/prisma.service.js', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { ProductVariantsService } from './product-variants.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockVariant = {
  id: 'variant-1',
  productId: 'product-1',
  sku: 'cool-tshirt-red-xl',
  stock: 10,
  priceCents: 1999,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ProductVariantsService', () => {
  let service: ProductVariantsService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductVariantsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ProductVariantsService>(ProductVariantsService);
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a variant when it exists', async () => {
      prismaMock.productVariant.findUnique.mockResolvedValue(mockVariant as any);

      const result = await service.findOne('variant-1');

      expect(prismaMock.productVariant.findUnique).toHaveBeenCalledWith({
        where: { id: 'variant-1' },
      });
      expect(result).toEqual(mockVariant);
    });

    it('should throw NotFoundException when variant does not exist', async () => {
      prismaMock.productVariant.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        new NotFoundException(`Product variant with ID "non-existent" not found`),
      );
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return the variant when it exists', async () => {
      const updated = { ...mockVariant, stock: 20 };
      prismaMock.productVariant.findUnique.mockResolvedValue(mockVariant as any);
      prismaMock.productVariant.update.mockResolvedValue(updated as any);

      const result = await service.update('variant-1', { stock: 20 });

      expect(prismaMock.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'variant-1' },
        data: { stock: 20 },
      });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when variant does not exist', async () => {
      prismaMock.productVariant.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { stock: 5 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── disable ───────────────────────────────────────────────────────────────

  describe('disable', () => {
    it('should set isActive to false when variant exists', async () => {
      const disabled = { ...mockVariant, isActive: false };
      prismaMock.productVariant.findUnique.mockResolvedValue(mockVariant as any);
      prismaMock.productVariant.update.mockResolvedValue(disabled as any);

      const result = await service.disable('variant-1');

      expect(prismaMock.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'variant-1' },
        data: { isActive: false },
      });
      expect(result).toEqual(disabled);
    });

    it('should throw NotFoundException when variant does not exist', async () => {
      prismaMock.productVariant.findUnique.mockResolvedValue(null);

      await expect(service.disable('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
