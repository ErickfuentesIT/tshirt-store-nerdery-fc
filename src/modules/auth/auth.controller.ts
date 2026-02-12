import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CreateUserRequestDto } from '../users/dto/request/create-user.dto.js';
import { CreateUserResponseDto } from '../users/dto/response/create-user.dto.js';
import { Serialize } from '../../common/decorators/serialize.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @Serialize(CreateUserResponseDto)
  async signUp(@Body() input: CreateUserRequestDto) {
    return this.authService.signUp(input);
  }
}
