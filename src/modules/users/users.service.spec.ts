jest.mock('../../common/prisma/prisma.service.js', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('bcrypt');

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { UsersService } from './users.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  email: 'john@example.com',
  username: 'johndoe',
  passwordHash: 'hashed-password',
  role: 'USER',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ── createUser ────────────────────────────────────────────────────────────

  describe('createUser', () => {
    const dto = {
      email: mockUser.email,
      username: mockUser.username,
      password: 'plain-password',
    };

    it('should hash the password, create the user, and return it', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prismaMock.user.create.mockResolvedValue(mockUser as any);

      const result = await service.createUser(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          username: dto.username,
          email: dto.email,
          passwordHash: 'hashed-password',
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException when email is already in use', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      await expect(service.createUser(dto)).rejects.toThrow(
        new ConflictException('Email already in use'),
      );

      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  // ── findByEmail ───────────────────────────────────────────────────────────

  describe('findByEmail', () => {
    it('should return the user when found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.findByEmail(mockUser.email);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return the user when found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.findById(mockUser.id);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  // ── updatePassword ────────────────────────────────────────────────────────

  describe('updatePassword', () => {
    it('should hash the new password and update the user record', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      prismaMock.user.update.mockResolvedValue(mockUser as any);

      await service.updatePassword(mockUser.id, 'new-plain-password');

      expect(bcrypt.hash).toHaveBeenCalledWith('new-plain-password', 10);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { passwordHash: 'new-hashed-password' },
      });
    });
  });
});
