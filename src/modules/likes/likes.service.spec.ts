jest.mock('../../common/prisma/prisma.service.js', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { LikesService } from './likes.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = 'user-1';
const VARIANT_ID = 'variant-1';
const FIXED_DATE = new Date('2024-01-01T00:00:00.000Z');

const mockLike = (overrides: Record<string, unknown> = {}) => ({
  id: 'like-1',
  userId: USER_ID,
  productVariantId: VARIANT_ID,
  createdAt: FIXED_DATE,
  ...overrides,
});

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('LikesService', () => {
  let service: LikesService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LikesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<LikesService>(LikesService);
  });

  // ── like ──────────────────────────────────────────────────────────────────

  describe('like', () => {
    it('should create a like record and return it', async () => {
      const like = mockLike();
      prismaMock.like.create.mockResolvedValue(like as any);

      const result = await service.like(USER_ID, VARIANT_ID);

      expect(prismaMock.like.create).toHaveBeenCalledWith({
        data: { userId: USER_ID, productVariantId: VARIANT_ID },
      });
      expect(result).toEqual(like);
    });
  });

  // ── unlike ────────────────────────────────────────────────────────────────

  describe('unlike', () => {
    it('should delete the like record and return it', async () => {
      const like = mockLike();
      prismaMock.like.delete.mockResolvedValue(like as any);

      const result = await service.unlike(USER_ID, VARIANT_ID);

      expect(prismaMock.like.delete).toHaveBeenCalledWith({
        where: {
          userId_productVariantId: { userId: USER_ID, productVariantId: VARIANT_ID },
        },
      });
      expect(result).toEqual(like);
    });
  });

  // ── findUserLikes ─────────────────────────────────────────────────────────

  describe('findUserLikes', () => {
    it('should return all likes for a user ordered by createdAt desc', async () => {
      const likes = [
        mockLike({ id: 'like-2', productVariantId: 'variant-2' }),
        mockLike(),
      ];
      prismaMock.like.findMany.mockResolvedValue(likes as any);

      const result = await service.findUserLikes(USER_ID);

      expect(prismaMock.like.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(likes);
    });

    it('should return an empty array when the user has no likes', async () => {
      prismaMock.like.findMany.mockResolvedValue([]);

      const result = await service.findUserLikes(USER_ID);

      expect(result).toEqual([]);
    });
  });
});
