jest.mock('../../../common/prisma/prisma.service.js', () => ({                                                                              
  PrismaService: class PrismaService {},                                                                                                    
}));  

jest.mock('bcrypt');

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { AuthService } from './auth.service.js';
import { UsersService } from '../../users/users.service.js';
import { TokensService } from './tokens.service.js';
import { CustomConfigService } from '../../../common/config/config.service.js';
import { EmailService } from '../../../common/email/email.service.js';

// ── Fixtures ────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  email: 'john@example.com',
  username: 'johndoe',
  passwordHash: 'hashed-password',
  role: 'USER' as const,
};


// ── Suite ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let usersService: DeepMockProxy<UsersService>;
  let tokensService: DeepMockProxy<TokensService>;
  let jwtService: DeepMockProxy<JwtService>;
  let emailService: DeepMockProxy<EmailService>;
  let configService: DeepMockProxy<CustomConfigService>; // Typed as a mock
  beforeEach(async () => {
    usersService = mockDeep<UsersService>();
    tokensService = mockDeep<TokensService>();
    jwtService = mockDeep<JwtService>();
    emailService = mockDeep<EmailService>();
    configService = mockDeep<CustomConfigService>(); // Initialize deep mock

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: TokensService, useValue: tokensService },
        { provide: JwtService, useValue: jwtService },
        { provide: EmailService, useValue: emailService },
        { provide: CustomConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should return tokens when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      tokensService.createRefreshToken.mockResolvedValue('jti-abc');
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login({
        email: mockUser.email,
        password: 'plain-password',
      });

      expect(result).toEqual({
        id: mockUser.id,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'pass' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: mockUser.email, password: 'wrong' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });
  });

  // ── signUp ─────────────────────────────────────────────────────────────────

  describe('signUp', () => {
    it('should delegate to usersService.createUser and return the result', async () => {
      usersService.createUser.mockResolvedValue(mockUser as any);

      const dto = {
        email: mockUser.email,
        username: mockUser.username,
        password: 'plain-password',
      };

      const result = await service.signUp(dto as any);

      expect(usersService.createUser).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockUser);
    });
  });

  // ── refreshToken ───────────────────────────────────────────────────────────

  describe('refreshToken', () => {
    const payload = { id: mockUser.id, jti: 'old-jti' };

    it('should rotate tokens when the refresh token is valid', async () => {
      tokensService.isTokenValid.mockResolvedValue(true);
      usersService.findById.mockResolvedValue(mockUser as any);
      tokensService.revokeToken.mockResolvedValue(undefined as any);
      tokensService.createRefreshToken.mockResolvedValue('new-jti');
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshToken(payload);

      expect(tokensService.revokeToken).toHaveBeenCalledWith(payload.jti);
      expect(result).toEqual({
        id: mockUser.id,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      tokensService.isTokenValid.mockResolvedValue(false);

      await expect(service.refreshToken(payload)).rejects.toThrow(
        new UnauthorizedException('Token is invalid or has been revoked'),
      );
    });

    it('should throw UnauthorizedException when user no longer exists', async () => {
      tokensService.isTokenValid.mockResolvedValue(true);
      usersService.findById.mockResolvedValue(null);

      await expect(service.refreshToken(payload)).rejects.toThrow(
        new UnauthorizedException('User no longer exists'),
      );
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should revoke the token and return the result', async () => {
      const revokedToken = { id: 1, isValid: false } as any;
      tokensService.revokeToken.mockResolvedValue(revokedToken);

      const result = await service.logout('jti-xyz');

      expect(tokensService.revokeToken).toHaveBeenCalledWith('jti-xyz');
      expect(result).toEqual(revokedToken);
    });
  });

  // ── forgotPassword ─────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('should send a reset email and return the generic message when user exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      tokensService.createPasswordResetToken.mockResolvedValue('reset-token');
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(mockUser.email);

      expect(tokensService.createPasswordResetToken).toHaveBeenCalledWith(
        mockUser.id,
        configService.passwordReset.ttl,
      );
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        'reset-token',
      );
      expect(result.message).toMatch(/password reset link has been sent/i);
    });

    it('should return the same generic message even when user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('ghost@example.com');

      expect(tokensService.createPasswordResetToken).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(result.message).toMatch(/password reset link has been sent/i);
    });
  });

  // ── resetPassword ──────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    const tokenRecord = { id: 1, userId: mockUser.id, tokenId: 'reset-token' };

    it('should update the password and revoke the token on success', async () => {
      tokensService.findValidPasswordResetToken.mockResolvedValue(
        tokenRecord as any,
      );
      usersService.updatePassword.mockResolvedValue(undefined as any);
      tokensService.revokeToken.mockResolvedValue(undefined as any);

      const result = await service.resetPassword('reset-token', 'new-pass');

      expect(usersService.updatePassword).toHaveBeenCalledWith(
        mockUser.id,
        'new-pass',
      );
      expect(tokensService.revokeToken).toHaveBeenCalledWith('reset-token');
      expect(result).toEqual({
        message: 'Password has been reset successfully.',
      });
    });

    it('should throw BadRequestException when token is invalid or expired', async () => {
      tokensService.findValidPasswordResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword('bad-token', 'new-pass'),
      ).rejects.toThrow(
        new BadRequestException('Invalid or expired password reset token'),
      );

      expect(usersService.updatePassword).not.toHaveBeenCalled();
    });
  });
});
