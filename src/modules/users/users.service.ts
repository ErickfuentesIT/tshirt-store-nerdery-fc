import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateUserRequestDto } from './dto/request/create-user.dto.js';
import { SignInRequestDto } from './dto/request/sign-in-dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(dto: CreateUserRequestDto) {
    const existingUser = await this.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        phoneNumber: dto.phoneNumber,
        email: dto.email,
        passwordHash: hashedPassword,
      },
    });

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });
  }
}
