jest.mock('../../../common/prisma/prisma.service.js', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('uuid', () => ({ v4: jest.fn() }));

jest.mock('../helper/calculate-expiry-date.helper.js', () => ({
  calculateExpiryDate: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { v4 as uuidv4 } from 'uuid';
import { TokenType } from '@prisma/client';

import { TokensService } from './tokens.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { calculateExpiryDate } from '../helper/calculate-expiry-date.helper.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FIXED_JTI = 'fixed-uuid-1234';
const FIXED_EXPIRY = new Date('2099-01-01T00:00:00.000Z');

const mockDbToken = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  userId: 'user-1',
  tokenId: FIXED_JTI,
  type: TokenType.refresh,
  isValid: true,
  expiresAt: FIXED_EXPIRY,
  createdAt: new Date(),
  ...overrides,
});

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('TokensService', () => {
  let service: TokensService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    (uuidv4 as jest.Mock).mockReturnValue(FIXED_JTI);
    (calculateExpiryDate as jest.Mock).mockReturnValue(FIXED_EXPIRY);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<TokensService>(TokensService);
  });

  // ── createRefreshToken ────────────────────────────────────────────────────

  describe('createRefreshToken', () => {
    it('should create a refresh token record and return the tokenId (JTI)', async () => {
      const token = mockDbToken();
      prismaMock.jwtToken.create.mockResolvedValue(token as any);

      const result = await service.createRefreshToken('user-1', '7d');

      expect(prismaMock.jwtToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          tokenId: FIXED_JTI,
          type: TokenType.refresh,
          expiresAt: FIXED_EXPIRY,
          isValid: true,
        },
      });
      expect(result).toBe(FIXED_JTI);
    });
  });

  // ── isTokenValid ──────────────────────────────────────────────────────────

  describe('isTokenValid', () => {
    it('should return true when token exists, belongs to the user, is valid, and has not expired', async () => {
      prismaMock.jwtToken.findFirst.mockResolvedValue(
        mockDbToken({ expiresAt: FIXED_EXPIRY }) as any,
      );

      const result = await service.isTokenValid(FIXED_JTI, 'user-1');

      expect(result).toBe(true);
    });

    it('should return false when token is not found', async () => {
      prismaMock.jwtToken.findFirst.mockResolvedValue(null);

      const result = await service.isTokenValid(FIXED_JTI, 'user-1');

      expect(result).toBe(false);
    });

    it('should return false when token belongs to a different user', async () => {
      prismaMock.jwtToken.findFirst.mockResolvedValue(
        mockDbToken({ userId: 'other-user' }) as any,
      );

      const result = await service.isTokenValid(FIXED_JTI, 'user-1');

      expect(result).toBe(false);
    });

    it('should return false when token has been revoked', async () => {
      prismaMock.jwtToken.findFirst.mockResolvedValue(
        mockDbToken({ isValid: false }) as any,
      );

      const result = await service.isTokenValid(FIXED_JTI, 'user-1');

      expect(result).toBe(false);
    });

    it('should return false when token has expired', async () => {
      prismaMock.jwtToken.findFirst.mockResolvedValue(
        mockDbToken({ expiresAt: new Date('2000-01-01') }) as any,
      );

      const result = await service.isTokenValid(FIXED_JTI, 'user-1');

      expect(result).toBe(false);
    });
  });

  // ── revokeToken ───────────────────────────────────────────────────────────

  describe('revokeToken', () => {
    it('should set isValid to false on the found token', async () => {
      const token = mockDbToken();
      const revoked = mockDbToken({ isValid: false });
      prismaMock.jwtToken.findFirst.mockResolvedValue(token as any);
      prismaMock.jwtToken.update.mockResolvedValue(revoked as any);

      const result = await service.revokeToken(FIXED_JTI);

      expect(prismaMock.jwtToken.findFirst).toHaveBeenCalledWith({
        where: { tokenId: FIXED_JTI },
      });
      expect(prismaMock.jwtToken.update).toHaveBeenCalledWith({
        where: { id: token.id },
        data: { isValid: false },
      });
      expect(result).toEqual(revoked);
    });
  });

  // ── createPasswordResetToken ──────────────────────────────────────────────

  describe('createPasswordResetToken', () => {
    it('should invalidate existing reset tokens, create a new one, and return the tokenId', async () => {
      const token = mockDbToken({ type: TokenType.password_reset });
      prismaMock.jwtToken.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.jwtToken.create.mockResolvedValue(token as any);

      const result = await service.createPasswordResetToken('user-1', '15m');

      expect(prismaMock.jwtToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: TokenType.password_reset,
          isValid: true,
        },
        data: { isValid: false },
      });
      expect(prismaMock.jwtToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          tokenId: FIXED_JTI,
          type: TokenType.password_reset,
          expiresAt: FIXED_EXPIRY,
          isValid: true,
        },
      });
      expect(result).toBe(FIXED_JTI);
    });
  });

  // ── findValidPasswordResetToken ───────────────────────────────────────────

  describe('findValidPasswordResetToken', () => {
    it('should return a token record when a valid password reset token exists', async () => {
      const token = mockDbToken({ type: TokenType.password_reset });
      prismaMock.jwtToken.findFirst.mockResolvedValue(token as any);

      const result = await service.findValidPasswordResetToken(FIXED_JTI);

      expect(prismaMock.jwtToken.findFirst).toHaveBeenCalledWith({
        where: {
          tokenId: FIXED_JTI,
          type: TokenType.password_reset,
          isValid: true,
          expiresAt: { gt: expect.any(Date) },
        },
      });
      expect(result).toEqual(token);
    });

    it('should return null when no valid token is found', async () => {
      prismaMock.jwtToken.findFirst.mockResolvedValue(null);

      const result = await service.findValidPasswordResetToken('bad-token');

      expect(result).toBeNull();
    });
  });
});
