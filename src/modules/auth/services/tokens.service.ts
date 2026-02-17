import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { v4 as uuidv4 } from 'uuid';
import { TokenType } from '@prisma/client';

@Injectable()
export class TokensService {
  constructor(private prisma: PrismaService) {}

  async createRefreshToken(userId: string, ttl: string) {
    const tokenId = uuidv4();
    const expiresAt = this.calculateExpiryDate(ttl);

    const token = await this.prisma.jwtToken.create({
      data: {
        userId,
        tokenId,
        type: TokenType.refresh,
        expiresAt,
        isValid: true,
      },
    });

    return token.tokenId; // Returns the JTI to be put into the JWT payload
  }

  async isTokenValid(tokenId: string, userId: string): Promise<boolean> {
    const token = await this.prisma.jwtToken.findFirst({
      where: { tokenId },
    });
    // Check if it exists, belongs to the user, hasn't been revoked, and hasn't expired
    return (
      !!token &&
      token.userId === userId &&
      token.isValid &&
      token.expiresAt > new Date()
    );
  }

  async revokeToken(tokenId: string) {
    const token = await this.prisma.jwtToken.findFirst({ where: { tokenId } });

    return this.prisma.jwtToken.update({
      where: { id: token?.id },
      data: { isValid: false },
    });
  }

  async createPasswordResetToken(userId: string, ttl: string) {
    // Invalidate any existing password reset tokens for this user
    await this.prisma.jwtToken.updateMany({
      where: {
        userId,
        type: TokenType.password_reset,
        isValid: true,
      },
      data: { isValid: false },
    });

    const tokenId = uuidv4();
    const expiresAt = this.calculateExpiryDate(ttl);

    const token = await this.prisma.jwtToken.create({
      data: {
        userId,
        tokenId,
        type: TokenType.password_reset,
        expiresAt,
        isValid: true,
      },
    });

    return token.tokenId;
  }

  async findValidPasswordResetToken(tokenId: string) {
    return this.prisma.jwtToken.findFirst({
      where: {
        tokenId,
        type: TokenType.password_reset,
        isValid: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  private calculateExpiryDate(ttl: string): Date {
    const numeric = parseInt(ttl);
    const unit = ttl.slice(-1);
    const now = new Date();

    if (unit === 'd') now.setDate(now.getDate() + numeric);
    else if (unit === 'h') now.setHours(now.getHours() + numeric);
    else if (unit === 'm') now.setMinutes(now.getMinutes() + numeric);
    else if (unit === 's') now.setSeconds(now.getSeconds() + numeric);
    else now.setDate(now.getDate() + 7); // Default fallback

    return now;
  }
}
