import { Body, Controller, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './services/auth.service.js';
import { CreateUserRequestDto } from '../users/dto/request/create-user.dto.js';
import { CreateUserResponseDto } from '../users/dto/response/create-user.dto.js';
import { SignInRequestDto } from './dto/login.dto.js';
import { Serialize } from '../../common/decorators/serialize.decorator.js';
import { RefreshAuthGuard } from './guards/refresh-auth/refresh-auth.guard.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { LoginResponseDto } from './dto/response/login-response.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Serialize(CreateUserResponseDto)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ type: CreateUserRequestDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    type: CreateUserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation error or email already in use' })
  async signUp(@Body() input: CreateUserRequestDto) {
    return this.authService.signUp(input);
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiBody({ type: SignInRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns access and refresh tokens',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid credentials' })
  async login(@Body() input: SignInRequestDto) {
    return this.authService.login(input);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshAuthGuard)
  @ApiBearerAuth('refresh-token')
  @ApiOperation({ summary: 'Rotate tokens using a valid refresh token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns new access and refresh tokens',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Refresh token invalid or revoked' })
  async refreshToken(@Request() req) {
    return this.authService.refreshToken(req.user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshAuthGuard)
  @ApiBearerAuth('refresh-token')
  @ApiOperation({ summary: 'Revoke the current refresh token and log out' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Logged out successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Refresh token invalid or revoked' })
  async logout(@Request() req) {
    await this.authService.logout(req.user.jti);
    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { ttl: 60000, limit: 3 },
    long: { ttl: 3600000, limit: 5 },
  })
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset email sent if the account exists',
    schema: { example: { message: 'If an account with that email exists, a password reset link has been sent.' } },
  })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { ttl: 60000, limit: 3 },
    long: { ttl: 3600000, limit: 5 },
  })
  @ApiOperation({ summary: 'Reset password using a valid reset token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successfully',
    schema: { example: { message: 'Password has been reset successfully.' } },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid or expired reset token' })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }
}
