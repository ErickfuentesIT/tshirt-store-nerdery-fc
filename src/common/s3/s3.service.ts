import { Injectable, BadRequestException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CustomConfigService } from '../config/config.service.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: CustomConfigService) {
    const { region, accessKeyId, secretAccessKey, s3BucketName } =
      this.configService.aws;

    this.bucketName = s3BucketName;
    this.region = region;

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  private readonly allowedContentTypes = [
    'image/png',
    'image/jpeg',
    'image/webp',
  ];

  async generateSignedUrl(
    fileName: string,
    contentType: string,
  ): Promise<{ signedUrl: string; key: string; publicUrl: string }> {
    if (!this.allowedContentTypes.includes(contentType)) {
      throw new BadRequestException(
        `Invalid content type "${contentType}". Allowed types: ${this.allowedContentTypes.join(', ')}`,
      );
    }

    const key = `images/${uuidv4()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      ACL: 'public-read',
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 300, // 5 minutes
      signableHeaders: new Set(['host', 'content-type']),
    });

    const publicUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

    return { signedUrl, key, publicUrl };
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }
}
