jest.mock('../../../common/prisma/prisma.service.js', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { AttributesService } from './attributes.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockAttribute = {
  id: 'attr-1',
  code: 'RED',
  displayName: 'Red',
  attributeCategoryId: 'attrcat-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('AttributesService', () => {
  let service: AttributesService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttributesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AttributesService>(AttributesService);
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return an attribute when it exists', async () => {
      prismaMock.attribute.findUnique.mockResolvedValue(mockAttribute as any);

      const result = await service.findOne('attr-1');

      expect(prismaMock.attribute.findUnique).toHaveBeenCalledWith({
        where: { id: 'attr-1' },
      });
      expect(result).toEqual(mockAttribute);
    });

    it('should throw NotFoundException when attribute does not exist', async () => {
      prismaMock.attribute.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        new NotFoundException(`Attribute with ID "non-existent" not found`),
      );
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return the attribute when it exists', async () => {
      const updated = { ...mockAttribute, displayName: 'Crimson Red' };
      prismaMock.attribute.findUnique.mockResolvedValue(mockAttribute as any);
      prismaMock.attribute.update.mockResolvedValue(updated as any);

      const result = await service.update('attr-1', { displayName: 'Crimson Red' });

      expect(prismaMock.attribute.update).toHaveBeenCalledWith({
        where: { id: 'attr-1' },
        data: { displayName: 'Crimson Red' },
      });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when attribute does not exist', async () => {
      prismaMock.attribute.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { displayName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete and return the attribute when it is not in use', async () => {
      prismaMock.attribute.findUnique.mockResolvedValue(mockAttribute as any);
      prismaMock.variantAttributeCategory.count.mockResolvedValue(0);
      prismaMock.attribute.delete.mockResolvedValue(mockAttribute as any);

      const result = await service.remove('attr-1');

      expect(prismaMock.variantAttributeCategory.count).toHaveBeenCalledWith({
        where: { attributeId: 'attr-1' },
      });
      expect(prismaMock.attribute.delete).toHaveBeenCalledWith({
        where: { id: 'attr-1' },
      });
      expect(result).toEqual(mockAttribute);
    });

    it('should throw ConflictException when attribute is assigned to variants', async () => {
      prismaMock.attribute.findUnique.mockResolvedValue(mockAttribute as any);
      prismaMock.variantAttributeCategory.count.mockResolvedValue(3);

      await expect(service.remove('attr-1')).rejects.toThrow(
        new ConflictException(
          `Cannot delete attribute: it is assigned to 3 product variant(s). Disable the variants first.`,
        ),
      );

      expect(prismaMock.attribute.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when attribute does not exist', async () => {
      prismaMock.attribute.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );

      expect(prismaMock.variantAttributeCategory.count).not.toHaveBeenCalled();
      expect(prismaMock.attribute.delete).not.toHaveBeenCalled();
    });
  });
});
