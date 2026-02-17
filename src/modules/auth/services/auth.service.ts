import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/users.service.js';
import { CreateUserRequestDto } from '../../users/dto/request/create-user.dto.js';
import { JwtService } from '@nestjs/jwt';
import { SignInRequestDto } from '../dto/login.dto.js';
import { CustomConfigService } from '../../../common/config/config.service.js';
import { AuthJwtPayload } from '../types/auth-jwt-payload.type.js';
import { TokensService } from './tokens.service.js';
import { RefreshJwtPayload } from '../types/refresh-jwt-payload.type.js';
import { EmailService } from '../../../common/email/email.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: CustomConfigService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly tokensService: TokensService,
    private readonly emailService: EmailService,
  ) {}

  async login(input: SignInRequestDto) {
    const user = await this.usersService.findByEmail(input.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      input.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const jti = await this.tokensService.createRefreshToken(
      user.id,
      this.configService.auth.refresh_expires_in,
    );

    const payload: AuthJwtPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    const refreshPayload: RefreshJwtPayload = {
      id: user.id,
      jti,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.auth.refresh_secret,
      expiresIn: this.configService.auth.refresh_expires_in,
    });

    return { id: user.id, accessToken, refreshToken };
  }

  async signUp(dto: CreateUserRequestDto) {
    return this.usersService.createUser(dto);
  }

  async refreshToken(body: RefreshJwtPayload) {
    const isTokenValid = await this.tokensService.isTokenValid(
      body.jti,
      body.id,
    );

    if (!isTokenValid) {
      throw new UnauthorizedException('Token is invalid or has been revoked');
    }

    const user = await this.usersService.findById(body.id);
    if (!user) throw new UnauthorizedException('User no longer exists');

    // Revoke the old refresh token
    await this.tokensService.revokeToken(body.jti);

    // New refresh token (token rotation)
    const newJti = await this.tokensService.createRefreshToken(
      user.id,
      this.configService.auth.refresh_expires_in,
    );

    const payload: AuthJwtPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    const refreshPayload: RefreshJwtPayload = {
      id: user.id,
      jti: newJti,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.auth.refresh_secret,
      expiresIn: this.configService.auth.refresh_expires_in,
    });

    return { id: user.id, accessToken, refreshToken };
  }

  async logout(tokenId: string) {
    return await this.tokensService.revokeToken(tokenId);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    if (user) {
      const token = await this.tokensService.createPasswordResetToken(
        user.id,
        this.configService.passwordReset.ttl, // 15 minutes
      );

      await this.emailService.sendPasswordResetEmail(user.email, token);
    }

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenRecord =
      await this.tokensService.findValidPasswordResetToken(token);

    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    await this.usersService.updatePassword(tokenRecord.userId, newPassword);
    await this.tokensService.revokeToken(token);

    return { message: 'Password has been reset successfully.' };
  }
}
