import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService) {}

  like(userId: string, productVariantId: string) {
    return this.prisma.like.create({
      data: { userId, productVariantId },
    });
  }

  unlike(userId: string, productVariantId: string) {
    return this.prisma.like.delete({
      where: { userId_productVariantId: { userId, productVariantId } },
    });
  }

  findUserLikes(userId: string) {
    return this.prisma.like.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
