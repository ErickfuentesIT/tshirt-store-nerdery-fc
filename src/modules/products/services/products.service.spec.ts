jest.mock('../../../common/prisma/prisma.service.js', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('../helper/generate-sku.helper.js', () => ({
  generateSku: jest.fn(),
}));

jest.mock('../helper/assert-no-duplicate-categories.helper.js', () => ({
  assertNoDuplicateCategories: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { ProductsService } from './products.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { StripeService } from '../../../common/stripe/stripe.service.js';
import { CustomConfigService } from '../../../common/config/config.service.js';
import { generateSku } from '../helper/generate-sku.helper.js';
import { assertNoDuplicateCategories } from '../helper/assert-no-duplicate-categories.helper.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BUCKET_URL = 'https://my-bucket.s3.us-east-1.amazonaws.com';

const mockConfigService = {
  aws: { s3BucketName: 'my-bucket', region: 'us-east-1' },
};

const mockStripeData = {
  stripeProductId: 'prod_stripe',
  stripePriceId: 'price_stripe',
  stripePaymentLinkId: 'plink_stripe',
  stripePaymentLinkUrl: 'https://buy.stripe.com/test',
};

const mockProduct = {
  id: 'product-1',
  name: 'Cool T-Shirt',
  description: 'A cool shirt',
  basePrice: 1999,
  categoryId: 'cat-1',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockVariant = {
  id: 'variant-1',
  productId: 'product-1',
  sku: 'cool-tshirt-red-xl',
  stock: 10,
  priceCents: 1999,
  ...mockStripeData,
};

const mockCategory = { id: 'cat-1', name: 'T-Shirts' };

const mockAttribute = (id: string, code: string) => ({
  id,
  code,
  attributeCategoryId: `attrcat-${id}`,
  attributeCategory: { name: `Category ${id}` },
});

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaMock: DeepMockProxy<PrismaService>;
  let stripeServiceMock: DeepMockProxy<StripeService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();
    stripeServiceMock = mockDeep<StripeService>();

    prismaMock.$transaction.mockImplementation((fn: any) =>
      typeof fn === 'function' ? fn(prismaMock) : Promise.all(fn),
    );

    (generateSku as jest.Mock).mockReturnValue('cool-tshirt-red-xl');
    (assertNoDuplicateCategories as jest.Mock).mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StripeService, useValue: stripeServiceMock },
        { provide: CustomConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return active products with pagination', async () => {
      prismaMock.product.findMany.mockResolvedValue([mockProduct] as any);

      const result = await service.findAll(0, 10);

      expect(prismaMock.product.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockProduct]);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a product when it exists', async () => {
      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);

      const result = await service.findOne('product-1');

      expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-1' },
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        new NotFoundException(`Product with ID "non-existent" not found`),
      );
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return the product when it exists', async () => {
      const updated = { ...mockProduct, name: 'Updated T-Shirt' };
      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaMock.product.update.mockResolvedValue(updated as any);

      const result = await service.update('product-1', { name: 'Updated T-Shirt' });

      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { name: 'Updated T-Shirt' },
      });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── disable ───────────────────────────────────────────────────────────────

  describe('disable', () => {
    it('should set isActive to false when product exists', async () => {
      const disabled = { ...mockProduct, isActive: false };
      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaMock.product.update.mockResolvedValue(disabled as any);

      const result = await service.disable('product-1');

      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { isActive: false },
      });
      expect(result).toEqual(disabled);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(service.disable('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── createWithVariants ────────────────────────────────────────────────────

  describe('createWithVariants', () => {
    const variantInput = {
      priceCents: 1999,
      stock: 10,
      attributeValueIds: ['attr-1'],
      imageKeys: ['images/red-xl.jpg'],
    };

    const createInput = {
      name: 'Cool T-Shirt',
      description: 'A cool shirt',
      basePrice: 1999,
      categoryId: 'cat-1',
      variants: [variantInput],
    };

    beforeEach(() => {
      stripeServiceMock.generateVariantStripeData.mockResolvedValue(
        mockStripeData as any,
      );
      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);
      prismaMock.attribute.findMany.mockResolvedValue([
        mockAttribute('attr-1', 'red'),
      ] as any);
      prismaMock.product.create.mockResolvedValue(mockProduct as any);
      prismaMock.productVariant.create.mockResolvedValue(mockVariant as any);
      prismaMock.variantAttributeCategory.createMany.mockResolvedValue({ count: 1 });
      prismaMock.image.createMany.mockResolvedValue({ count: 1 });
      stripeServiceMock.deactivateVariantStripeData.mockResolvedValue(undefined);
    });

    it('should create product with variants and return the product', async () => {
      const result = await service.createWithVariants(createInput as any);

      expect(stripeServiceMock.generateVariantStripeData).toHaveBeenCalledWith(
        'Cool T-Shirt',
        1999,
        [`${BUCKET_URL}/images/red-xl.jpg`],
      );
      expect(prismaMock.product.create).toHaveBeenCalledWith({
        data: {
          name: createInput.name,
          description: createInput.description,
          basePrice: createInput.basePrice,
          categoryId: createInput.categoryId,
        },
      });
      expect(prismaMock.productVariant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sku: 'cool-tshirt-red-xl',
            stock: 10,
            priceCents: 1999,
          }),
        }),
      );
      expect(result).toEqual(mockProduct);
    });

    it('should build image URLs from bucket URL and image keys', async () => {
      await service.createWithVariants(createInput as any);

      expect(prismaMock.image.createMany).toHaveBeenCalledWith({
        data: [
          {
            productId: mockProduct.id,
            variantId: mockVariant.id,
            imageKey: 'images/red-xl.jpg',
            imageUrl: `${BUCKET_URL}/images/red-xl.jpg`,
          },
        ],
      });
    });

    it('should throw NotFoundException when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(
        service.createWithVariants(createInput as any),
      ).rejects.toThrow(
        new NotFoundException(`Category with ID "cat-1" not found`),
      );
    });

    it('should throw NotFoundException when an attribute ID does not exist', async () => {
      prismaMock.attribute.findMany.mockResolvedValue([] as any);

      await expect(
        service.createWithVariants(createInput as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on duplicate SKU (P2002)', async () => {
      const prismaError = Object.assign(new Error('Unique constraint'), {
        code: 'P2002',
      });
      prismaMock.productVariant.create.mockRejectedValue(prismaError);

      await expect(
        service.createWithVariants(createInput as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when assertNoDuplicateCategories rejects', async () => {
      (assertNoDuplicateCategories as jest.Mock).mockImplementationOnce(() => {
        throw new BadRequestException('Duplicate attribute category');
      });

      await expect(
        service.createWithVariants(createInput as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call deactivateVariantStripeData when transaction fails', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(
        service.createWithVariants(createInput as any),
      ).rejects.toThrow();

      expect(stripeServiceMock.deactivateVariantStripeData).toHaveBeenCalledWith(
        [mockStripeData],
      );
    });

    it('should skip image creation when imageKeys is empty', async () => {
      const inputNoImages = {
        ...createInput,
        variants: [{ ...variantInput, imageKeys: [] }],
      };

      await service.createWithVariants(inputNoImages as any);

      expect(prismaMock.image.createMany).not.toHaveBeenCalled();
    });
  });

  // ── addVariants ───────────────────────────────────────────────────────────

  describe('addVariants', () => {
    const variantInput = {
      priceCents: 2499,
      stock: 5,
      attributeValueIds: ['attr-1'],
      imageKeys: ['images/blue-m.jpg'],
    };

    const addInput = { variants: [variantInput] };

    beforeEach(() => {
      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      stripeServiceMock.generateVariantStripeData.mockResolvedValue(
        mockStripeData as any,
      );
      prismaMock.attribute.findMany.mockResolvedValue([
        mockAttribute('attr-1', 'blue'),
      ] as any);
      prismaMock.productVariant.create.mockResolvedValue(mockVariant as any);
      prismaMock.variantAttributeCategory.createMany.mockResolvedValue({ count: 1 });
      prismaMock.image.createMany.mockResolvedValue({ count: 1 });
      stripeServiceMock.deactivateVariantStripeData.mockResolvedValue(undefined);
    });

    it('should add variants to an existing product and return the product', async () => {
      const result = await service.addVariants('product-1', addInput as any);

      expect(prismaMock.productVariant.create).toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addVariants('non-existent', addInput as any),
      ).rejects.toThrow(
        new NotFoundException(`Product with ID "non-existent" not found`),
      );
      expect(stripeServiceMock.generateVariantStripeData).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when an attribute does not exist', async () => {
      prismaMock.attribute.findMany.mockResolvedValue([] as any);

      await expect(
        service.addVariants('product-1', addInput as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on duplicate SKU (P2002)', async () => {
      const prismaError = Object.assign(new Error('Unique constraint'), {
        code: 'P2002',
      });
      prismaMock.productVariant.create.mockRejectedValue(prismaError);

      await expect(
        service.addVariants('product-1', addInput as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should call deactivateVariantStripeData when transaction fails', async () => {
      prismaMock.attribute.findMany.mockResolvedValue([] as any);

      await expect(
        service.addVariants('product-1', addInput as any),
      ).rejects.toThrow();

      expect(stripeServiceMock.deactivateVariantStripeData).toHaveBeenCalledWith(
        [mockStripeData],
      );
    });

    it('should skip image creation when imageKeys is empty', async () => {
      const inputNoImages = {
        variants: [{ ...variantInput, imageKeys: [] }],
      };

      await service.addVariants('product-1', inputNoImages as any);

      expect(prismaMock.image.createMany).not.toHaveBeenCalled();
    });
  });
});
