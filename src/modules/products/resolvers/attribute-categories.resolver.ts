import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { AttributeCategory } from '../models/attribute-category.model.js';
import { AttributeCategoriesService } from '../services/attribute-categories.service.js';
import { CreateAttributeCategoryInput } from '../dto/create-attribute-category.input.js';
import { UpdateAttributeCategoryInput } from '../dto/update-attribute-category.input.js';

@Resolver(() => AttributeCategory)
export class AttributeCategoriesResolver {
  constructor(
    private readonly attributeCategoriesService: AttributeCategoriesService,
  ) {}

  @Query(() => [AttributeCategory], { name: 'attributeCategories' })
  async findAll(@Args('attributeId', { type: () => ID }) attributeId: string) {
    return this.attributeCategoriesService.findAll(attributeId);
  }

  @Query(() => AttributeCategory, { name: 'attributeCategory' })
  async findOne(@Args('id', { type: () => ID }) id: string) {
    return this.attributeCategoriesService.findOne(id);
  }

  @Mutation(() => AttributeCategory)
  async createAttributeCategory(
    @Args('data') data: CreateAttributeCategoryInput,
  ) {
    return this.attributeCategoriesService.create(data);
  }

  @Mutation(() => AttributeCategory)
  async updateAttributeCategory(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: UpdateAttributeCategoryInput,
  ) {
    return this.attributeCategoriesService.update(id, data);
  }

  @Mutation(() => AttributeCategory)
  async deleteAttributeCategory(@Args('id', { type: () => ID }) id: string) {
    return this.attributeCategoriesService.remove(id);
  }
}
