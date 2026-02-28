jest.mock('../../../common/prisma/prisma.service.js', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('../helper/slugify.helper.js', () => ({
  slugify: jest.fn((text: string) => text.toUpperCase().replace(/[^A-Z0-9]+/g, '-')),
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { AttributeCategoriesService } from './attribute-categories.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockAttributeCategory = {
  id: 'attrcat-1',
  name: 'Color',
  attributes: [
    { id: 'attr-1', code: 'RED', displayName: 'Red', attributeCategoryId: 'attrcat-1' },
  ],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('AttributeCategoriesService', () => {
  let service: AttributeCategoriesService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    prismaMock.$transaction.mockImplementation((fn: any) =>
      typeof fn === 'function' ? fn(prismaMock) : Promise.all(fn),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttributeCategoriesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AttributeCategoriesService>(AttributeCategoriesService);
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all attribute categories with their attributes', async () => {
      prismaMock.attributeCategory.findMany.mockResolvedValue([mockAttributeCategory] as any);

      const result = await service.findAll();

      expect(prismaMock.attributeCategory.findMany).toHaveBeenCalledWith({
        include: { attributes: true },
      });
      expect(result).toEqual([mockAttributeCategory]);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return an attribute category when it exists', async () => {
      prismaMock.attributeCategory.findUnique.mockResolvedValue(mockAttributeCategory as any);

      const result = await service.findOne('attrcat-1');

      expect(prismaMock.attributeCategory.findUnique).toHaveBeenCalledWith({
        where: { id: 'attrcat-1' },
        include: { attributes: true },
      });
      expect(result).toEqual(mockAttributeCategory);
    });

    it('should throw NotFoundException when attribute category does not exist', async () => {
      prismaMock.attributeCategory.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        new NotFoundException(`Attribute category with ID "non-existent" not found`),
      );
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return the attribute category when it exists', async () => {
      const updated = { ...mockAttributeCategory, name: 'Size' };
      prismaMock.attributeCategory.findUnique.mockResolvedValue(mockAttributeCategory as any);
      prismaMock.attributeCategory.update.mockResolvedValue(updated as any);

      const result = await service.update('attrcat-1', { name: 'Size' });

      expect(prismaMock.attributeCategory.update).toHaveBeenCalledWith({
        where: { id: 'attrcat-1' },
        data: { name: 'Size' },
        include: { attributes: true },
      });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when attribute category does not exist', async () => {
      prismaMock.attributeCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete and return the attribute category when it exists', async () => {
      const deleted = { ...mockAttributeCategory, attributes: undefined };
      prismaMock.attributeCategory.findUnique.mockResolvedValue(mockAttributeCategory as any);
      prismaMock.attributeCategory.delete.mockResolvedValue(deleted as any);

      const result = await service.remove('attrcat-1');

      expect(prismaMock.attributeCategory.delete).toHaveBeenCalledWith({
        where: { id: 'attrcat-1' },
      });
      expect(result).toEqual(deleted);
    });

    it('should throw NotFoundException when attribute category does not exist', async () => {
      prismaMock.attributeCategory.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);

      expect(prismaMock.attributeCategory.delete).not.toHaveBeenCalled();
    });
  });

  // ── insertAttributesWithCategory ──────────────────────────────────────────

  describe('insertAttributesWithCategory', () => {
    // Case A: create new category with attributes
    describe('Case A – create new category', () => {
      it('should create a new category with nested attributes', async () => {
        prismaMock.attributeCategory.create.mockResolvedValue(mockAttributeCategory as any);

        const result = await service.insertAttributesWithCategory({
          name: 'Color',
          values: ['Red'],
        });

        expect(prismaMock.attributeCategory.create).toHaveBeenCalledWith({
          data: {
            name: 'Color',
            attributes: {
              createMany: {
                data: [{ code: 'RED', displayName: 'Red' }],
              },
            },
          },
          include: { attributes: true },
        });
        expect(result).toEqual(mockAttributeCategory);
      });
    });

    // Case B: append attributes to existing category
    describe('Case B – append to existing category', () => {
      it('should append attributes to an existing category', async () => {
        const updatedCategory = {
          ...mockAttributeCategory,
          attributes: [
            ...mockAttributeCategory.attributes,
            { id: 'attr-2', code: 'BLUE', displayName: 'Blue', attributeCategoryId: 'attrcat-1' },
          ],
        };
        prismaMock.attributeCategory.findUnique
          .mockResolvedValueOnce(mockAttributeCategory as any) // existence check inside tx
          .mockResolvedValueOnce(updatedCategory as any);       // final fetch
        prismaMock.attribute.createMany.mockResolvedValue({ count: 1 });

        const result = await service.insertAttributesWithCategory({
          attributeCategoryId: 'attrcat-1',
          values: ['Blue'],
        });

        expect(prismaMock.attribute.createMany).toHaveBeenCalledWith({
          data: [{ code: 'BLUE', displayName: 'Blue', attributeCategoryId: 'attrcat-1' }],
        });
        expect(result).toEqual(updatedCategory);
      });

      it('should throw NotFoundException when the existing category is not found', async () => {
        prismaMock.attributeCategory.findUnique.mockResolvedValue(null);

        await expect(
          service.insertAttributesWithCategory({
            attributeCategoryId: 'non-existent',
            values: ['Blue'],
          }),
        ).rejects.toThrow(
          new NotFoundException(`Attribute category with ID "non-existent" not found`),
        );

        expect(prismaMock.attribute.createMany).not.toHaveBeenCalled();
      });
    });

    // Validation errors
    describe('validation', () => {
      it('should throw BadRequestException when neither name nor attributeCategoryId is provided', async () => {
        await expect(
          service.insertAttributesWithCategory({ values: ['Red'] } as any),
        ).rejects.toThrow(
          new BadRequestException(
            'Provide either name (Case A: new category) or attributeCategoryId (Case B: existing category).',
          ),
        );
      });

      it('should throw BadRequestException when both name and attributeCategoryId are provided', async () => {
        await expect(
          service.insertAttributesWithCategory({
            name: 'Color',
            attributeCategoryId: 'attrcat-1',
            values: ['Red'],
          }),
        ).rejects.toThrow(
          new BadRequestException('Provide either name or attributeCategoryId, not both.'),
        );
      });
    });
  });
});
