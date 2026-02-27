jest.mock('../../common/prisma/prisma.service.js', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

const mockCategory = {
  id: 'cat-1',
  name: 'T-Shirts',
  products: [],
};

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('create', () => {
    it('should create a category and return it', async () => {
      prismaMock.category.create.mockResolvedValue(mockCategory);

      const result = await service.create({ name: 'T-Shirts' });

      expect(prismaMock.category.create).toHaveBeenCalledWith({
        data: { name: 'T-Shirts' },
      });
      expect(result).toEqual(mockCategory);
    });
  });

  describe('findAll', () => {
    it('should return all categories with their products', async () => {
      const categories = [mockCategory];
      prismaMock.category.findMany.mockResolvedValue(categories);

      const result = await service.findAll();

      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        include: { products: true },
      });
      expect(result).toEqual(categories);
    });
  });

  describe('findOne', () => {
    it('should return a category when it exists', async () => {
      prismaMock.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findOne('cat-1');

      expect(prismaMock.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        include: { products: true },
      });
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        new NotFoundException('Category with ID "non-existent" not found'),
      );
    });
  });

  describe('update', () => {
    it('should update and return the category when it exists', async () => {
      const updatedCategory = { ...mockCategory, name: 'Hoodies' };
      prismaMock.category.findUnique.mockResolvedValue(mockCategory);
      prismaMock.category.update.mockResolvedValue(updatedCategory);

      const result = await service.update('cat-1', { name: 'Hoodies' });

      expect(prismaMock.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { name: 'Hoodies' },
        include: { products: true },
      });
      expect(result).toEqual(updatedCategory);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'Hoodies' }),
      ).rejects.toThrow(
        new NotFoundException('Category with ID "non-existent" not found'),
      );
      expect(prismaMock.category.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete and return the category when it exists', async () => {
      const deletedCategory = { id: 'cat-1', name: 'T-Shirts' };
      prismaMock.category.findUnique.mockResolvedValue(mockCategory);
      prismaMock.category.delete.mockResolvedValue(deletedCategory);

      const result = await service.remove('cat-1');

      expect(prismaMock.category.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
      expect(result).toEqual(deletedCategory);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        new NotFoundException('Category with ID "non-existent" not found'),
      );
      expect(prismaMock.category.delete).not.toHaveBeenCalled();
    });
  });
});
