import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args, ID } from '@nestjs/graphql';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth/jwt-auth.guard.js';
import { PoliciesGuard } from '../../../common/guards/policies.guard.js';
import { CheckPolicies } from '../../../common/decorators/check-policies.decorator.js';
import { Action } from '../../../common/casl/casl.types.js';
import { Image } from '../models/image.model.js';
import { SignedUrlResponse } from '../models/signed-url.model.js';
import { ImagesService } from '../services/images.service.js';
import { GetSignedUrlInput } from '../dto/get-signed-url.input.js';
import { CreateImageInput } from '../dto/create-image.input.js';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Resolver(() => Image)
export class ImagesResolver {
  constructor(private readonly imagesService: ImagesService) {}

  @CheckPolicies((ability) => ability.can(Action.Create, Image))
  @Mutation(() => SignedUrlResponse, {
    description:
      'Generates a pre-signed URL for uploading an image to S3. The client should use this URL to PUT the file directly to S3. Allowed ContentType: image/png, image/jpeg, image/webp',
  })
  async getSignedUrl(@Args('data') data: GetSignedUrlInput) {
    return this.imagesService.getSignedUrl(data.fileName, data.contentType);
  }

  @CheckPolicies((ability) => ability.can(Action.Create, Image))
  @Mutation(() => Image, {
    description:
      'Creates an image record in the database after the file has been uploaded to S3.',
  })
  async createImage(@Args('data') data: CreateImageInput) {
    return this.imagesService.create(data);
  }

  @CheckPolicies((ability) => ability.can(Action.Delete, Image))
  @Mutation(() => Image, {
    description: 'Deletes an image from both S3 and the database.',
  })
  async deleteImage(@Args('id', { type: () => ID }) id: string) {
    return this.imagesService.delete(id);
  }
}
