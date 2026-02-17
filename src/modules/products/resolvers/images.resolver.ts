import { Resolver, Mutation, Args, ID } from '@nestjs/graphql';
import { Image } from '../models/image.model.js';
import { SignedUrlResponse } from '../models/signed-url.model.js';
import { ImagesService } from '../services/images.service.js';
import { GetSignedUrlInput } from '../dto/get-signed-url.input.js';
import { CreateImageInput } from '../dto/create-image.input.js';

@Resolver(() => Image)
export class ImagesResolver {
  constructor(private readonly imagesService: ImagesService) {}

  @Mutation(() => SignedUrlResponse, {
    description:
      'Generates a pre-signed URL for uploading an image to S3. The client should use this URL to PUT the file directly to S3. Allowed ContentType: image/png, image/jpeg, image/webp',
  })
  async getSignedUrl(@Args('data') data: GetSignedUrlInput) {
    return this.imagesService.getSignedUrl(data.fileName, data.contentType);
  }

  @Mutation(() => Image, {
    description:
      'Creates an image record in the database after the file has been uploaded to S3.',
  })
  async createImage(@Args('data') data: CreateImageInput) {
    return this.imagesService.create(data);
  }

  @Mutation(() => Image, {
    description: 'Deletes an image from both S3 and the database.',
  })
  async deleteImage(@Args('id', { type: () => ID }) id: string) {
    return this.imagesService.delete(id);
  }
}
