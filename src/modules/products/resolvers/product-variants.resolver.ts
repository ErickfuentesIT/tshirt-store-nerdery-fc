import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { ProductVariant } from '../models/product-variant.model.js';
import { ProductVariantsService } from '../services/product-variants.service.js';
import { CreateProductVariantInput } from '../dto/create-product-variant.input.js';
import { UpdateProductVariantInput } from '../dto/update-product-variant.input.js';

@Resolver(() => ProductVariant)
export class ProductVariantsResolver {
  constructor(
    private readonly productVariantsService: ProductVariantsService,
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
}
