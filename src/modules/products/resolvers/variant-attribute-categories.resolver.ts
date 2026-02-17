import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { VariantAttributeCategory } from '../models/variant-attribute-category.model.js';
import { VariantAttributeCategoriesService } from '../services/variant-attribute-categories.service.js';
import { CreateVariantAttributeCategoryInput } from '../dto/create-variant-attribute-category.input.js';

@Resolver(() => VariantAttributeCategory)
export class VariantAttributeCategoriesResolver {
  constructor(
    private readonly variantAttributeCategoriesService: VariantAttributeCategoriesService,
  ) {}

  @Query(() => [VariantAttributeCategory], {
    name: 'variantAttributeCategories',
  })
  async findAllByVariant(
    @Args('variantId', { type: () => ID }) variantId: string,
  ) {
    return this.variantAttributeCategoriesService.findAllByVariant(variantId);
  }

  @Mutation(() => VariantAttributeCategory)
  async assignAttributeToVariant(
    @Args('data') data: CreateVariantAttributeCategoryInput,
  ) {
    return this.variantAttributeCategoriesService.create(data);
  }

  @Mutation(() => VariantAttributeCategory)
  async removeAttributeFromVariant(
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.variantAttributeCategoriesService.remove(id);
  }
}
