import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { CreateUserRequestDto } from '../users/dto/request/create-user.dto.js';
import { CreateUserResponseDto } from '../users/dto/response/create-user.dto.js';
import { SignInRequestDto } from './dto/login.dto.js';
import { Serialize } from '../../common/decorators/serialize.decorator.js';
import { RefreshAuthGuard } from './guards/refresh-auth/refresh-auth.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Serialize(CreateUserResponseDto)
  async signUp(@Body() input: CreateUserRequestDto) {
    return this.authService.signUp(input);
  }

  @Post('signin')
  async login(@Body() input: SignInRequestDto) {
    return this.authService.login(input);
  }
  @UseGuards(RefreshAuthGuard)
  @Post('refresh')
  async refreshToken(@Request() req) {
    return this.authService.refreshToken(req.user);
  }

  @UseGuards(RefreshAuthGuard)
  @Post('logout')
  async logout(@Request() req) {
    await this.authService.logout(req.user.jti);
    return { message: 'Logged out successfully' };
  }

  @Throttle({ short: { ttl: 60000, limit: 3 }, long: { ttl: 3600000, limit: 5 } })
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Throttle({ short: { ttl: 60000, limit: 3 }, long: { ttl: 3600000, limit: 5 } })
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }
}
