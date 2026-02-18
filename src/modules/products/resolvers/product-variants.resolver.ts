import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { ProductVariant } from '../models/product-variant.model.js';
import { VariantAttributeCategory } from '../models/variant-attribute-category.model.js';
import { Image } from '../models/image.model.js';
import { ProductVariantsService } from '../services/product-variants.service.js';
import { UpdateProductVariantInput } from '../dto/update-product-variant.input.js';
import { VariantAttributesLoader } from '../loaders/variant-attributes.loader.js';
import { VariantImagesLoader } from '../loaders/variant-images.loader.js';

@Resolver(() => ProductVariant)
export class ProductVariantsResolver {
  constructor(
    private readonly productVariantsService: ProductVariantsService,
    private readonly variantAttributesLoader: VariantAttributesLoader,
    private readonly variantImagesLoader: VariantImagesLoader,
  ) {}

  @Query(() => ProductVariant, { name: 'productVariant' })
  async findOne(@Args('id', { type: () => ID }) id: string) {
    return this.productVariantsService.findOne(id);
  }

  @Mutation(() => ProductVariant)
  async updateProductVariant(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: UpdateProductVariantInput,
  ) {
    return this.productVariantsService.update(id, data);
  }

  @Mutation(() => ProductVariant)
  async disableProductVariant(@Args('id', { type: () => ID }) id: string) {
    return this.productVariantsService.disable(id);
  }

  // ── Field resolvers ────────────────────────────────────────────────────────

  @ResolveField(() => [VariantAttributeCategory], { nullable: true })
  async variantAttributes(@Parent() variant: ProductVariant) {
    return this.variantAttributesLoader.loader.load(variant.id);
  }

  @ResolveField(() => [Image], { nullable: true })
  async images(@Parent() variant: ProductVariant) {
    return this.variantImagesLoader.loader.load(variant.id);
  }
}
