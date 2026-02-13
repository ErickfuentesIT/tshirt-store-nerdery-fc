import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { SignInRequestDto } from './dto/request/login.dto.js';
import { Serialize } from '../../common/decorators/serialize.decorator.js';
import { RefreshAuthGuard } from './guards/refresh-auth/refresh-auth.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard.js';
import { ForgotPasswordRequestDto } from './dto/request/forgot-password.dto.js';
import { ResetPasswordRequestDto } from './dto/request/reset-password.dto.js';
import { SignUpRequestDto } from './dto/request/signup.dto.js';
import { SignUpResponseDto } from './dto/response/signup-response.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Serialize(SignUpResponseDto)
  async signUp(@Body() input: SignUpRequestDto) {
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

  @Throttle({
    short: { ttl: 60000, limit: 3 },
    long: { ttl: 3600000, limit: 5 },
  })
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordRequestDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Throttle({
    short: { ttl: 60000, limit: 3 },
    long: { ttl: 3600000, limit: 5 },
  })
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordRequestDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }
}
