import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { CreateUserRequestDto } from '../users/dto/request/create-user.dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async signUp(dto: CreateUserRequestDto) {
    return this.usersService.createUser(dto);
  }
}
