jest.mock('../../../common/prisma/prisma.service.js', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('../../../common/s3/s3.service.js', () => ({
  S3Service: class S3Service {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { ImagesService } from './images.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { S3Service } from '../../../common/s3/s3.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockImage = {
  id: 'image-1',
  imageUrl: 'https://bucket.s3.amazonaws.com/images/shirt.jpg',
  imageKey: 'images/shirt.jpg',
  productId: 'product-1',
  variantId: null,
  createdAt: new Date('2024-01-01'),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ImagesService', () => {
  let service: ImagesService;
  let prismaMock: DeepMockProxy<PrismaService>;
  let s3Mock: DeepMockProxy<S3Service>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();
    s3Mock = mockDeep<S3Service>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImagesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: S3Service, useValue: s3Mock },
      ],
    }).compile();

    service = module.get<ImagesService>(ImagesService);
  });

  // ── getSignedUrl ──────────────────────────────────────────────────────────

  describe('getSignedUrl', () => {
    it('should return a signed URL from S3Service', async () => {
      const signedUrl = 'https://bucket.s3.amazonaws.com/images/shirt.jpg?signed=token';
      s3Mock.generateSignedUrl.mockResolvedValue(signedUrl as any);

      const result = await service.getSignedUrl('images/shirt.jpg', 'image/jpeg');

      expect(s3Mock.generateSignedUrl).toHaveBeenCalledWith('images/shirt.jpg', 'image/jpeg');
      expect(result).toBe(signedUrl);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create and return an image when productId is provided', async () => {
      prismaMock.image.create.mockResolvedValue(mockImage as any);

      const result = await service.create({
        imageUrl: mockImage.imageUrl,
        imageKey: mockImage.imageKey,
        productId: 'product-1',
      });

      expect(prismaMock.image.create).toHaveBeenCalledWith({
        data: {
          imageUrl: mockImage.imageUrl,
          imageKey: mockImage.imageKey,
          productId: 'product-1',
          variantId: undefined,
        },
      });
      expect(result).toEqual(mockImage);
    });

    it('should create and return an image when variantId is provided', async () => {
      const imageWithVariant = { ...mockImage, productId: null, variantId: 'variant-1' };
      prismaMock.image.create.mockResolvedValue(imageWithVariant as any);

      const result = await service.create({
        imageUrl: mockImage.imageUrl,
        imageKey: mockImage.imageKey,
        variantId: 'variant-1',
      });

      expect(prismaMock.image.create).toHaveBeenCalledWith({
        data: {
          imageUrl: mockImage.imageUrl,
          imageKey: mockImage.imageKey,
          productId: undefined,
          variantId: 'variant-1',
        },
      });
      expect(result).toEqual(imageWithVariant);
    });

    it('should throw BadRequestException when neither productId nor variantId is provided', async () => {
      await expect(
        service.create({
          imageUrl: mockImage.imageUrl,
          imageKey: mockImage.imageKey,
        }),
      ).rejects.toThrow(
        new BadRequestException('Either productId or variantId must be provided'),
      );

      expect(prismaMock.image.create).not.toHaveBeenCalled();
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should delete image from S3 and DB when it exists', async () => {
      prismaMock.image.findUnique.mockResolvedValue(mockImage as any);
      prismaMock.image.delete.mockResolvedValue(mockImage as any);
      s3Mock.deleteObject.mockResolvedValue(undefined as any);

      const result = await service.delete('image-1');

      expect(prismaMock.image.findUnique).toHaveBeenCalledWith({ where: { id: 'image-1' } });
      expect(s3Mock.deleteObject).toHaveBeenCalledWith(mockImage.imageKey);
      expect(prismaMock.image.delete).toHaveBeenCalledWith({ where: { id: 'image-1' } });
      expect(result).toEqual(mockImage);
    });

    it('should throw NotFoundException when image does not exist', async () => {
      prismaMock.image.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        new NotFoundException(`Image with ID "non-existent" not found`),
      );

      expect(s3Mock.deleteObject).not.toHaveBeenCalled();
      expect(prismaMock.image.delete).not.toHaveBeenCalled();
    });
  });
});
