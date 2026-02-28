jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ ...input, _type: 'PutObject' })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ ...input, _type: 'DeleteObject' })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { S3Service } from './s3.service.js';
import { CustomConfigService } from '../config/config.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockConfigService = {
  aws: {
    region: 'us-east-1',
    accessKeyId: 'access-key',
    secretAccessKey: 'secret-key',
    s3BucketName: 'my-bucket',
  },
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('S3Service', () => {
  let service: S3Service;
  let s3SendMock: jest.Mock;

  beforeEach(async () => {
    (S3Client as jest.Mock).mockClear();
    (getSignedUrl as jest.Mock).mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        { provide: CustomConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    s3SendMock = (service as any).s3Client.send as jest.Mock;
    s3SendMock.mockReset();
  });

  it('should initialise S3Client with the configured credentials', () => {
    expect(S3Client).toHaveBeenCalledWith({
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
      },
    });
  });

  // ── generateSignedUrl ─────────────────────────────────────────────────────

  describe('generateSignedUrl', () => {
    it.each(['image/png', 'image/jpeg', 'image/webp'])(
      'should return signedUrl, key, and publicUrl for "%s"',
      async (contentType) => {
        (getSignedUrl as jest.Mock).mockResolvedValue('https://presigned.url/upload');

        const result = await service.generateSignedUrl('shirt.jpg', contentType);

        expect(result).toEqual({
          signedUrl: 'https://presigned.url/upload',
          key: 'images/mocked-uuid-shirt.jpg',
          publicUrl: 'https://my-bucket.s3.us-east-1.amazonaws.com/images/mocked-uuid-shirt.jpg',
        });
      },
    );

    it('should call PutObjectCommand with the correct args', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://presigned.url/upload');

      await service.generateSignedUrl('shirt.jpg', 'image/png');

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'my-bucket',
        Key: 'images/mocked-uuid-shirt.jpg',
        ContentType: 'image/png',
        ACL: 'public-read',
      });
    });

    it('should throw BadRequestException for disallowed content type', async () => {
      await expect(
        service.generateSignedUrl('file.gif', 'image/gif'),
      ).rejects.toThrow(
        new BadRequestException(
          'Invalid content type "image/gif". Allowed types: image/png, image/jpeg, image/webp',
        ),
      );

      expect(getSignedUrl).not.toHaveBeenCalled();
    });
  });

  // ── deleteObject ──────────────────────────────────────────────────────────

  describe('deleteObject', () => {
    it('should call s3Client.send with a DeleteObjectCommand for the given key', async () => {
      s3SendMock.mockResolvedValue({});

      await service.deleteObject('images/shirt.jpg');

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'my-bucket',
        Key: 'images/shirt.jpg',
      });
      expect(s3SendMock).toHaveBeenCalledTimes(1);
    });
  });
});
