import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth/jwt-auth.guard.js';
import { PoliciesGuard } from '../../../common/guards/policies.guard.js';
import { CheckPolicies } from '../../../common/decorators/check-policies.decorator.js';
import { Action } from '../../../common/casl/casl.types.js';
import { ProductVariant } from '../models/product-variant.model.js';
import { VariantAttributeCategory } from '../models/variant-attribute-category.model.js';
import { Image } from '../models/image.model.js';
import { ProductVariantsService } from '../services/product-variants.service.js';
import { UpdateProductVariantInput } from '../dto/update-product-variant.input.js';
import { VariantAttributesLoader } from '../loaders/variant-attributes.loader.js';
import { VariantImagesLoader } from '../loaders/variant-images.loader.js';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Resolver(() => ProductVariant)
export class ProductVariantsResolver {
  constructor(
    private readonly productVariantsService: ProductVariantsService,
    private readonly variantAttributesLoader: VariantAttributesLoader,
    private readonly variantImagesLoader: VariantImagesLoader,
  ) {}

  // ─── Queries ─────────────────────────────────────────────────────────────────

  @CheckPolicies((ability) => ability.can(Action.Read, ProductVariant))
  @Query(() => ProductVariant, {
    name: 'productVariant',
    description: 'Fetches a single product variant by its ID.',
  })
  async findOne(@Args('id', { type: () => ID }) id: string) {
    return this.productVariantsService.findOne(id);
  }

  // ─── Mutations ───────────────────────────────────────────────────────────────

  @CheckPolicies((ability) => ability.can(Action.Update, ProductVariant))
  @Mutation(() => ProductVariant, {
    description:
      'Updates a variant\'s stock or price. The SKU is immutable and cannot be changed — it is generated once at creation time from the product name and attribute codes.',
  })
  async updateProductVariant(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: UpdateProductVariantInput,
  ) {
    return this.productVariantsService.update(id, data);
  }

  @CheckPolicies((ability) => ability.can(Action.Delete, ProductVariant))
  @Mutation(() => ProductVariant, {
    description:
      'Soft-deletes a variant by setting isActive to false. Use this to retire a variant with incorrect attributes before adding the correct replacement via addVariantsToProduct.',
  })
  async disableProductVariant(@Args('id', { type: () => ID }) id: string) {
    return this.productVariantsService.disable(id);
  }

  // ─── Field Resolvers ─────────────────────────────────────────────────────────

  @ResolveField(() => [VariantAttributeCategory], { nullable: true })
  async variantAttributes(@Parent() variant: ProductVariant) {
    return this.variantAttributesLoader.loader.load(variant.id);
  }

  @ResolveField(() => [Image], { nullable: true })
  async images(@Parent() variant: ProductVariant) {
    return this.variantImagesLoader.loader.load(variant.id);
  }
}
