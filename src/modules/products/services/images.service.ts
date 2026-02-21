import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { S3Service } from '../../../common/s3/s3.service.js';
import { CreateImageInput } from '../dto/create-image.input.js';

@Injectable()
export class ImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async getSignedUrl(fileName: string, contentType: string) {
    return this.s3Service.generateSignedUrl(fileName, contentType);
  }

  async create(data: CreateImageInput) {
    if (!data.productId && !data.variantId) {
      throw new BadRequestException(
        'Either productId or variantId must be provided',
      );
    }

    return this.prisma.image.create({
      data: {
        imageUrl: data.imageUrl,
        imageKey: data.imageKey,
        productId: data.productId,
        variantId: data.variantId,
      },
    });
  }

  async delete(id: string) {
    const image = await this.prisma.image.findUnique({ where: { id } });

    if (!image) {
      throw new NotFoundException(`Image with ID "${id}" not found`);
    }

    await this.s3Service.deleteObject(image.imageKey);

    return this.prisma.image.delete({ where: { id } });
  }
}
